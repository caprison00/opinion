// Hero.jsx — full-bleed marketing hero strip

const Hero = ({ headline, sub, cta, image }) => {
  return (
    <section className="wd-hero">
      <div className="wd-hero__bg" style={{ background: image }} />
      <div className="wd-hero__inner">
        <div className="wd-hero__copy">
          <span className="wd-hero__eyebrow">For Talents</span>
          <h1 className="wd-hero__headline">{headline}</h1>
          <p className="wd-hero__sub">{sub}</p>
          <div className="wd-hero__actions">
            <a href="#" onClick={(e) => e.preventDefault()} className="wd-btn wd-btn--primary wd-btn--lg">{cta}</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="wd-btn wd-btn--ghost wd-btn--lg">자세히 보기 →</a>
          </div>
        </div>
      </div>
    </section>
  );
};

window.Hero = Hero;
