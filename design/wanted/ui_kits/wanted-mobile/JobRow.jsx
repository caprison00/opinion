// JobRow.jsx
const JobRow = ({ company, title, location, employment, bonus, image }) => (
  <a className="wm-jobrow" href="#" onClick={(e) => e.preventDefault()}>
    <div className="wm-jobrow__thumb" style={{ background: image }} />
    <div className="wm-jobrow__body">
      <div className="wm-jobrow__company">{company}</div>
      <h3 className="wm-jobrow__title">{title}</h3>
      <div className="wm-jobrow__meta">
        <span>{location}</span><span className="dot"/><span>{employment}</span>
      </div>
      {bonus && <div className="wm-jobrow__bonus">합격보상금 {bonus}</div>}
    </div>
    <button className="wm-jobrow__bookmark" aria-label="Save" onClick={(e) => e.preventDefault()}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
    </button>
  </a>
);

window.JobRow = JobRow;
