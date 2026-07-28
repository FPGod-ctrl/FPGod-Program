import GeneratorScaffold from '../../components/GeneratorScaffold.jsx';

export default function GenerateClientProfile() {
  return (
    <GeneratorScaffold
      title="Generate Client Profile"
      sub="Lakeside client information & consent profile"
      icon="🧾"
      accent="var(--accent)"
      blurb="Fills the Lakeside Client Profile (information & consent form) from the selected household's data, ready to review and export as Word."
      ready={false}
      readyNote={
        'Next step: wire this to the Client Profile Word template (clone-and-fill) so picking a client generates and downloads the filled .docx. ' +
        'The template and build script already exist — I’ll connect them to this button.'
      }
    />
  );
}
