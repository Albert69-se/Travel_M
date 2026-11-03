import { requirementsForPath } from '../lib/requirement-guide.js';

export default function RequirementGuide({ pathname, onClose }) {
  const requirements = requirementsForPath(pathname);
  return (
    <section className="tm-fr-guide" aria-labelledby="fr-guide-title">
      <div className="tm-fr-guide-header">
        <div>
          <p className="tm-fr-guide-kicker">TEAM DEBUG MODE · M2 SRS v2.0</p>
          <h2 id="fr-guide-title">Requirements related to this screen</h2>
          <p>Use these notes to explain the visible controls and linked flows. A label is not proof that every criterion passes.</p>
        </div>
        <button type="button" className="tm-focus tm-fr-guide-close" onClick={onClose}>Turn off</button>
      </div>
      {requirements.length ? <div className="tm-fr-guide-list">
        {requirements.map(({ id, title, explanation, limitation }) => <article key={id} className="tm-fr-guide-card">
          <h3><span>FR-{id}</span> {title}</h3>
          <p>{explanation}</p><p className="tm-fr-guide-note">Note: {limitation}</p>
        </article>)}
      </div> : <p>No M2 functional requirement is mapped directly to this screen. Navigation and account controls support the main flows.</p>}
      <p className="tm-fr-guide-footnote">The M1 charter uses a different, shorter set of FR numbers. This guide uses the ten FRs in the M2 SRS.</p>
    </section>
  );
}
