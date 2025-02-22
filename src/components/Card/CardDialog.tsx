import Card from '@/components/Card/Card'
import { classNames } from '@/utils/class_name'
import { memo } from 'react'

import type { FC, ReactNode } from 'react'

const CardDialog: FC<{ className?: string; children: ReactNode }> = ({
  children,
  className
}) => {
  return (
    <>
      <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r animate-pulse-bit-slow from-purple-500 via-pink-500 to-amber-500 blur-md" />
      <Card
        className={classNames(
          'relative transition-shadow duration-300',
          className
        )}
      >
        {children}
      </Card>
    </>
  )
}

export default memo(CardDialog)
