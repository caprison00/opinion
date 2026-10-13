// FilterBar.jsx — Wanted Design System

const FilterBar = ({ active, onChange }) => {
  const filters = [
    { id: "all", label: "전체" },
    { id: "career", label: "경력" },
    { id: "stack", label: "기술스택" },
    { id: "location", label: "지역" },
    { id: "salary", label: "연봉" },
    { id: "type", label: "고용형태" },
  ];
  return (
    <div className="wd-filterbar">
      <div className="wd-filterbar__inner">
        {filters.map((f) => (
          <button
            key={f.id}
            className={"wd-chip" + (active === f.id ? " is-active" : "")}
            onClick={() => onChange?.(f.id)}
          >
            {f.label}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        ))}
      </div>
    </div>
  );
};

window.FilterBar = FilterBar;
