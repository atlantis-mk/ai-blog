import { Banner } from '@payloadcms/ui/elements/Banner'
import React from 'react'

import { SeedButton } from './SeedButton'
import './index.scss'

const baseClass = 'before-dashboard'

const BeforeDashboard: React.FC = () => {
  return (
    <div className={baseClass}>
      <Banner className={`${baseClass}__banner`} type="success">
        <h4>欢迎进入网站管理后台！</h4>
      </Banner>
      接下来你可以：
      <ul className={`${baseClass}__instructions`}>
        <li>
          <SeedButton />
          {'，快速生成一些示例页面和文章，然后'}
          <a href="/" target="_blank">
            访问网站
          </a>
          {'查看效果。'}
        </li>
        <li>
          {'根据需要修改'}
          <a
            href="https://payloadcms.com/docs/configuration/collections"
            rel="noopener noreferrer"
            target="_blank"
          >
            内容集合
          </a>
          {'并添加更多'}
          <a
            href="https://payloadcms.com/docs/fields/overview"
            rel="noopener noreferrer"
            target="_blank"
          >
            字段
          </a>
          {'。如果你刚开始使用 Payload，建议阅读'}
          <a
            href="https://payloadcms.com/docs/getting-started/what-is-payload"
            rel="noopener noreferrer"
            target="_blank"
          >
            快速入门
          </a>
          {'文档。'}
        </li>
        <li>
          提交并推送代码后，即可触发项目重新部署。
        </li>
      </ul>
      {'提示：这是一段'}
      <a
        href="https://payloadcms.com/docs/custom-components/overview"
        rel="noopener noreferrer"
        target="_blank"
      >
        自定义组件
      </a>
      ，你可以随时在 <strong>payload.config</strong> 中将它移除。
    </div>
  )
}

export default BeforeDashboard
