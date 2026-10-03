import { useOutletContext } from 'react-router-dom';
import ContentGrid from '../components/ContentGrid';
import { SECTIONS } from '../routes';

export default function NewsPage() {
  const { showToast } = useOutletContext();
  return <ContentGrid key="news" section={SECTIONS.news} showToast={showToast} />;
}
