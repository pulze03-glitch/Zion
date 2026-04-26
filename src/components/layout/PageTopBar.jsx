import { ChrysanthemumIcon } from '../shared/ChrysanthemumIcon'

export function PageTopBar({ title }) {
  return (
    <div className="page-top-bar">
      <span className="page-top-brand" aria-hidden>
        <ChrysanthemumIcon size={14} className="hub-bar-snowflake" />
        <span className="hub-bar-wordmark">Zion</span>
      </span>
      {title && (
        <>
          <span className="hub-bar-sep" aria-hidden />
          <span className="page-top-title">{title}</span>
        </>
      )}
    </div>
  )
}
