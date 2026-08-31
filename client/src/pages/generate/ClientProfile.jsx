import GeneratorScaffold from '../../components/GeneratorScaffold.jsx';

export default function GenerateClientProfile() {
  return (
    <GeneratorScaffold
      title="Generate Client Profile"
      sub="Client information & consent profile"
      icon="🧾"
      accent="var(--accent)"
      blurb="Fills the Client Profile (information & consent form) from the selected household's data, ready to review and export as Word."
      ready={false}
      readyNote={
        'Awaiting the Legacy Risk Advice client profile Word template. The clone-and-fill generator already works — ' +
        'drop the Legacy template into legacy/templates/ and this button gets wired to it.'
      }
    />
  );
}
