import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { VideoGrid } from './components/video/VideoGrid';
import { VideoModal } from './components/video/VideoModal';
import { ImportDialog } from './components/import/ImportDialog';
import { ImportQueue } from './components/import/ImportQueue';
import './styles/global.css';

function App() {
  return (
    <div className="app">
      <Header />
      <div className="main-layout">
        <Sidebar />
        <main className="content">
          <VideoGrid />
        </main>
      </div>
      <VideoModal />
      <ImportDialog />
      <ImportQueue />
    </div>
  );
}

export default App;
