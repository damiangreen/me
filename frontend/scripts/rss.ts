import fg from 'fast-glob'
import { Feed } from 'feed'
import { statSync } from 'fs'
import fs from 'fs-extra'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import { parse } from 'path'
import urlJoin from 'url-join'

import { AUTHOR, COPYRIGHT, DOMAIN } from '../src/constants'

const run = async () => {
  const markdown = MarkdownIt({
    html: true,
    breaks: true,
    linkify: true
  })
  const files = await fg('./src/pages/posts/*.md')

  const posts: any[] = await Promise.all(
    files
      .filter((i) => !i.includes('index'))
      .map(async (i) => {
        const raw = await fs.readFile(i, 'utf-8')
        const { ctimeMs } = statSync(i)
        const { data, content } = matter(raw)

        const html = markdown.render(content)

        return {
          ...data,
          image: data.icatch,
          date: new Date(ctimeMs),
          link: urlJoin(DOMAIN, 'posts', parse(i).name),
          content: html,
          author: [
            {
              name: AUTHOR,
              link: DOMAIN
            }
          ]
        }
      })
  )

  const feed = new Feed({
    title: 'Home | Tomoki Miyauchi',
    description: `This is Tomoki Miyauchi's personal site. You can check the activity record of Tomoki Miyauchi such as technical blog and list of projects. The site is made up of Vite and SSG and is focused on internationalization.`,
    id: DOMAIN,
    link: DOMAIN,
    image: urlJoin(DOMAIN, 'logo.png'),
    favicon: urlJoin(DOMAIN, 'favicon.ico'),
    copyright: COPYRIGHT,
    feedLinks: {
      json: urlJoin(DOMAIN, 'feed.json'),
      atom: urlJoin(DOMAIN, 'feed.atom'),
      rss: urlJoin(DOMAIN, 'feed.xml')
    },
    author: {
      name: AUTHOR,
      link: DOMAIN
    }
  })

  posts.forEach((i) => feed.addItem(i))

  await fs.writeFile('./dist/feed.xml', feed.rss2(), 'utf-8')
  await fs.writeFile('./dist/feed.atom', feed.atom1(), 'utf-8')
  await fs.writeFile('./dist/feed.json', feed.json1(), 'utf-8')
}
run()
