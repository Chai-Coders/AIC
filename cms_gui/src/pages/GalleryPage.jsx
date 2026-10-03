import { useOutletContext } from 'react-router-dom';
import ContentGrid from '../components/ContentGrid';
import { SECTIONS } from '../routes';

export default function GalleryPage() {
  const { showToast } = useOutletContext();
  return <ContentGrid key="gallery" section={SECTIONS.gallery} showToast={showToast} />;
}
