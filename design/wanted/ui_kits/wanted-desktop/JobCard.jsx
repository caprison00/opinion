// JobCard.jsx — Wanted Design System
// Job posting card matching Wanted.co.kr's hero list pattern

const JobCard = ({ company, title, location, tags = [], bonus, image, badge }) => {
  return (
    <a className="wd-jobcard" href="#" onClick={(e) => e.preventDefault()}>
      <div className="wd-jobcard__thumb" style={{ background: image }}>
        {badge && <span className="wd-jobcard__badge">{badge}</span>}
      </div>
      <div className="wd-jobcard__body">
        <h3 className="wd-jobcard__title">{title}</h3>
        <div className="wd-jobcard__company">{company}</div>
        <div className="wd-jobcard__meta">
          <span>{location}</span>
          {tags.map((t, i) => (<span key={i} className="wd-jobcard__tag">· {t}</span>))}
        </div>
        {bonus && <div className="wd-jobcard__bonus">합격보상금 {bonus}</div>}
      </div>
    </a>
  );
};

window.JobCard = JobCard;
