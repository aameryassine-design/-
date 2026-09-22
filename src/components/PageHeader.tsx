import type { ReactNode } from 'react'

interface Props {
  title: string
  description?: string
  children?: ReactNode
}

export function PageHeader({ title, description, children }: Props) {
  return (
    <div className="page-header">
      <div>
        <h2 className="page-header__title">{title}</h2>
        {description ? <p className="page-header__description">{description}</p> : null}
      </div>
      {children ? <div className="page-header__actions">{children}</div> : null}
    </div>
  )
}
