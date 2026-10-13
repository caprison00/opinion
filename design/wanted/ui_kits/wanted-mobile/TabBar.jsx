// TabBar.jsx
const TabBar = ({ active, onChange }) => {
  const items = [
    { id: "home", label: "홈", icon: <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/> },
    { id: "match", label: "매칭", icon: <><path d="M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"/><path d="m21 21-4.35-4.35"/></> },
    { id: "resume", label: "이력서", icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 14h6M9 18h4"/></> },
    { id: "saved", label: "저장", icon: <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/> },
    { id: "more", label: "더보기", icon: <><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></> },
  ];
  return (
    <div className="wm-tabbar">
      {items.map((it) => (
        <button key={it.id} className={"wm-tabitem" + (active === it.id ? " is-active" : "")} onClick={() => onChange?.(it.id)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active === it.id ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">{it.icon}</svg>
          <span>{it.label}</span>
        </button>
      ))}
    </div>
  );
};

window.TabBar = TabBar;
