export function PageTopBar({ title }) {
  return (
    <div className="page-top-bar">
      <span className="page-top-brand" aria-hidden>
        <span className="hub-bar-snowflake">❄</span>
        <span className="hub-bar-wordmark">Frost</span>
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
