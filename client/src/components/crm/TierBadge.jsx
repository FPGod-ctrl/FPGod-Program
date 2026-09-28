/** Legacy's premium tier (Platinum, Gold, Silver, Bronze) as a small coloured badge. */
export default function TierBadge({ tier, title }) {
  if (!tier) return null;
  return (
    <span className={`tier-badge tier-${tier.key}`} title={title || `${tier.label}: premium ${tier.premium}`}>
      {tier.label}
    </span>
  );
}
