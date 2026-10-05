import { useOutletContext } from 'react-router-dom';
import ContentGrid from '../components/ContentGrid';
import { SECTIONS } from '../routes';

export default function StartupsPage() {
  const { showToast } = useOutletContext();
  return <ContentGrid key="startups" section={SECTIONS.startups} showToast={showToast} />;
}
