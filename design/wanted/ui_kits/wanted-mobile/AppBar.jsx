// AppBar.jsx
const AppBar = () => (
  <div className="wm-appbar">
    <div className="wm-logo" aria-label="Wanted">
      <svg viewBox="0 0 1272 869" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M 442 869 C 477 869 508 841 508 797 L 508 457 L 413 457 L 413 716 C 413 724 406 726 401 721 L 147 470 C 141 463 144 457 153 457 L 781 457 L 781 362 L 73 362 C 28 362 0 393 0 429 C 0 446 7 464 24 481 L 389 846 C 405 863 424 869 442 869 Z M 1026 853 C 1161 853 1272 742 1272 607 C 1272 472 1161 362 1026 362 L 876 362 L 876 457 L 1026 457 C 1107 457 1177 523 1177 607 C 1177 691 1108 758 1026 758 C 944 758 876 689 876 607 L 876 82 C 876 35 840 0 794 0 L 496 0 C 448 0 413 36 413 83 L 413 362 L 508 362 L 508 106 C 508 100 512 95 518 95 L 770 95 C 776 95 781 100 781 106 L 781 607 C 781 742 891 853 1026 853 Z"/>
      </svg>
    </div>
    <div className="wm-appbar__actions">
      <button className="wm-iconbtn" aria-label="Search">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      </button>
      <button className="wm-iconbtn" aria-label="Notifications" style={{ position: 'relative' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        <span className="badge"></span>
      </button>
      <button className="wm-iconbtn" aria-label="Profile">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </button>
    </div>
  </div>
);

window.AppBar = AppBar;
