// TopNav.jsx — Wanted Design System
// Top navigation matching wanted.co.kr's marketing/job header

const TopNav = ({ onCommand }) => {
  const links = ["채용", "이력서", "프로필", "AI 매칭", "프리랜서", "커뮤니티"];
  return (
    <header className="wd-topnav">
      <div className="wd-topnav__inner">
        <div className="wd-topnav__brand">
          <a href="#" onClick={(e) => e.preventDefault()} className="wd-logo">
            <svg viewBox="0 0 1272 869" aria-hidden="true">
              <path d="M 442 869 C 477 869 508 841 508 797 L 508 457 L 413 457 L 413 716 C 413 724 406 726 401 721 L 147 470 C 141 463 144 457 153 457 L 781 457 L 781 362 L 73 362 C 28 362 0 393 0 429 C 0 446 7 464 24 481 L 389 846 C 405 863 424 869 442 869 Z M 1026 853 C 1161 853 1272 742 1272 607 C 1272 472 1161 362 1026 362 L 876 362 L 876 457 L 1026 457 C 1107 457 1177 523 1177 607 C 1177 691 1108 758 1026 758 C 944 758 876 689 876 607 L 876 82 C 876 35 840 0 794 0 L 496 0 C 448 0 413 36 413 83 L 413 362 L 508 362 L 508 106 C 508 100 512 95 518 95 L 770 95 C 776 95 781 100 781 106 L 781 607 C 781 742 891 853 1026 853 Z" />
            </svg>
          </a>
          <nav className="wd-topnav__links">
            {links.map((l, i) => (
              <a key={i} href="#" onClick={(e) => e.preventDefault()} className={i === 0 ? "is-active" : ""}>{l}</a>
            ))}
          </nav>
        </div>
        <div className="wd-topnav__right">
          <button className="wd-iconbtn" onClick={onCommand} aria-label="Search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </button>
          <button className="wd-iconbtn" aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          </button>
          <a href="#" onClick={(e) => e.preventDefault()} className="wd-topnav__signin">로그인 / 회원가입</a>
          <a href="#" onClick={(e) => e.preventDefault()} className="wd-btn wd-btn--primary wd-btn--sm">기업 서비스</a>
        </div>
      </div>
      <nav className="wd-topnav__sub">
        <div className="wd-topnav__sub-inner">
          {["전체", "개발", "경영·비즈니스", "마케팅·광고", "디자인", "영업", "고객서비스", "HR", "금융", "의료", "교육", "법률", "엔지니어링", "미디어"].map((c, i) => (
            <a key={c} href="#" onClick={(e) => e.preventDefault()} className={i === 1 ? "is-active" : ""}>{c}</a>
          ))}
        </div>
      </nav>
    </header>
  );
};

window.TopNav = TopNav;
