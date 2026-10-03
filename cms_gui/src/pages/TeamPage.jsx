import { useOutletContext } from 'react-router-dom';
import ContentGrid from '../components/ContentGrid';
import { SECTIONS } from '../routes';

export default function TeamPage() {
  const { showToast } = useOutletContext();
  return <ContentGrid key="team" section={SECTIONS.team} showToast={showToast} />;
}
