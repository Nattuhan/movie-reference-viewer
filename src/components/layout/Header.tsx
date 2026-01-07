import { useVideoStore } from '../../stores/videoStore';
import { useUIStore } from '../../stores/uiStore';
import './Header.css';

const platform = window.electronAPI?.app.getPlatform() ?? 'win32';
const isMac = platform === 'darwin';

export function Header() {
  const { searchText, setSearchText } = useVideoStore();
  const { openImportDialog, viewMode, setViewMode } = useUIStore();

  return (
    <header className={`header ${isMac ? 'platform-mac' : ''}`}>
      <div className="header-left">
        <h1 className="app-title">Reference Viewer</h1>
      </div>

      <div className="header-center">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="search"
            placeholder="Search videos..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {searchText && (
            <button className="search-clear" onClick={() => setSearchText('')}>
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="header-right">
        <div className="view-toggle">
          <button
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            ⊞
          </button>
          <button
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            ☰
          </button>
        </div>

        <button className="import-btn" onClick={openImportDialog}>
          + Import
        </button>
      </div>
    </header>
  );
}
