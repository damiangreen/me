import WebPush from '@/components/WebPush/WebPush'
import TestWebPush from '@/components/WebPush/TestWebPush'
import { useFirebase } from '@/hooks/firebase'
import { useNotice } from '@/hooks/notice'
import { useUnsubscribe } from '@/components/WebPush/hooks'
import { useAuth } from '@/hooks/auth'
import { useLocalization } from 'gatsby-theme-i18n'
import { useSafeLogEvent } from '@/hooks/analytics'
import { defineComponent } from '@/utils/component'

import type { Locale } from 'config/types'
import { getServiceWorker } from '@/utils/firebase'

const NOT_GRANTED =
  'The notification permission was not granted. Please check browser settings'

const Index = defineComponent(({ className }) => {
  const [{ messaging, firestore }] = useFirebase()
  const [_, notice] = useNotice()
  const [{ uid, isLoggedIn }] = useAuth()
  const [hasSubscribed, changeHasSubscribed] = useUnsubscribe()
  const { locale } = useLocalization()
  const { safeLogEvent } = useSafeLogEvent()

  const handleSubscribe = async (locale: Locale): Promise<void> => {
    if (!messaging || !firestore) {
      return
    }
    const { requestFcmToken, getServiceWorker, postFCMToken } = await import(
      '@/utils/firebase'
    )
    const sw = await getServiceWorker('/sw.js')

    if (!sw) {
      return
    }

    const token = await requestFcmToken(messaging, sw)
    if (!token) {
      notice({
        type: 'alert',
        field: <div>{NOT_GRANTED}</div>
      })
      return
    }

    const result = await postFCMToken(
      firestore,
      {
        token,
        topics: ['article', locale]
      },
      uid!
    )
    await changeHasSubscribed()

    if (result) {
      notice({
        type: 'success',
        field: <div>Success subscription Web Push</div>
      })
      safeLogEvent((analytics, logEvent) => {
        logEvent(analytics, 'subscription', {
          type: 'webpush'
        })
      })
    } else {
      notice({
        type: 'alert',
        field: <span>Already subscribed</span>
      })
    }
  }

  const handleUnsubscribe = async () => {
    if (!messaging) return
    const { collection, getDocs, deleteDoc } = await import(
      'firebase/firestore/lite'
    )

    const { requestFcmToken, getServiceWorker } = await import(
      '@/utils/firebase'
    )
    const sw = await getServiceWorker('/sw.js')

    if (!sw) {
      return
    }

    const { deleteToken } = await import('firebase/messaging')
    const col = collection(firestore!, 'users', uid!, 'fcm')
    const { docs } = await getDocs(col)

    await requestFcmToken(messaging, sw)

    await Promise.all(
      Array.from(docs).map(async (doc) => {
        await deleteDoc(doc.ref)
      })
    )

    await deleteToken(messaging)
    notice({
      type: 'success',
      field: <div>Unsubscribed push message</div>
    })
    safeLogEvent((analytics, logEvent) => {
      logEvent(analytics, 'unsubscription', {
        type: 'webpush'
      })
    })
    changeHasSubscribed()
  }

  const handleError = ({ name, message }: Error) => {
    notice({
      type: 'alert',
      field: <div>Something went wrong. This error has reported.</div>
    })

    safeLogEvent((analytics, logEvent) => {
      logEvent(analytics, 'exception', {
        description: message,
        name
      })
    })
  }

  return (
    <WebPush
      className={className}
      isLoggedIn={isLoggedIn}
      locale={locale as Locale}
      hasSubscribed={hasSubscribed}
      onSubscribe={handleSubscribe}
      onUnsubscribe={handleUnsubscribe}
      onSuccess={() => {}}
      onError={handleError}
      Test={
        <TestWebPush
          className="mb-8"
          onForeground={() => {
            notice({
              type: 'success',
              field: <div>This is test message</div>
            })
          }}
          onBackground={async () => {
            const sw = await getServiceWorker('/sw')
            if (!sw || !('Notification' in window)) {
              return notice({
                type: 'alert',
                field: <div>This browser is not available</div>
              })
            }

            window.Notification.requestPermission((permission) => {
              switch (permission) {
                case 'granted': {
                  return sw.showNotification('Hello Test', {
                    body: 'This is test message from service worker',
                    icon: 'http://placehold.jp/150x150.png'
                  })
                }

                case 'denied': {
                  return notice({
                    type: 'alert',
                    field: <div>{NOT_GRANTED}</div>
                  })
                }
              }
            })
          }}
        />
      }
    />
  )
})

export default Index
