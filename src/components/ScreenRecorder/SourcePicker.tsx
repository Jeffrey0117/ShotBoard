import React, { useState, useEffect, useCallback } from 'react';
import './SourcePicker.css';

export type RecordingSourceType = 'screen' | 'window' | 'region';

export interface RecordingSource {
  type: RecordingSourceType;
  sourceId: string;
  name: string;
  thumbnail?: string;
  appIcon?: string;
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface DesktopSource {
  id: string;
  name: string;
  type: 'screen' | 'window';
  thumbnail: string;
  appIcon?: string;
  display?: {
    id: number;
    bounds: { x: number; y: number; width: number; height: number };
  };
}

interface SourcePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (source: RecordingSource) => void;
}

export const SourcePicker: React.FC<SourcePickerProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [activeTab, setActiveTab] = useState<RecordingSourceType>('screen');
  const [sources, setSources] = useState<DesktopSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [showCursor, setShowCursor] = useState(true);
  const [enableOverlay, setEnableOverlay] = useState(true);

  // 載入可用的來源
  const loadSources = useCallback(async () => {
    setLoading(true);
    try {
      const desktopSources = await window.electronAPI?.getDesktopSources();
      if (desktopSources) {
        setSources(desktopSources);

        // 自動選擇第一個螢幕
        const firstScreen = desktopSources.find((s: DesktopSource) => s.type === 'screen');
        if (firstScreen) {
          setSelectedSourceId(firstScreen.id);
        }
      }
    } catch (error) {
      console.error('Failed to load desktop sources:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSources();
    }
  }, [isOpen, loadSources]);

  // 過濾當前標籤的來源
  const filteredSources = sources.filter((source) => {
    if (activeTab === 'screen') return source.type === 'screen';
    if (activeTab === 'window') return source.type === 'window';
    return false;
  });

  // 選擇區域
  const handleSelectRegion = async () => {
    onClose();
    try {
      const region = await window.electronAPI?.selectRecordingRegion();
      if (region) {
        onSelect({
          type: 'region',
          sourceId: 'region',
          name: `區域 (${region.width}x${region.height})`,
          region,
        });
      }
    } catch (error) {
      console.error('Failed to select region:', error);
    }
  };

  // 確認選擇
  const handleConfirm = () => {
    if (activeTab === 'region') {
      handleSelectRegion();
      return;
    }

    const selectedSource = sources.find((s) => s.id === selectedSourceId);
    if (selectedSource) {
      onSelect({
        type: selectedSource.type,
        sourceId: selectedSource.id,
        name: selectedSource.name,
        thumbnail: selectedSource.thumbnail,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="source-picker-overlay" onClick={onClose}>
      <div className="source-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="source-picker-header">
          <h2>選擇錄製來源</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        {/* 標籤切換 */}
        <div className="source-picker-tabs">
          <button
            className={`tab-button ${activeTab === 'screen' ? 'active' : ''}`}
            onClick={() => setActiveTab('screen')}
          >
            <span className="tab-icon">🖥️</span>
            螢幕
          </button>
          <button
            className={`tab-button ${activeTab === 'window' ? 'active' : ''}`}
            onClick={() => setActiveTab('window')}
          >
            <span className="tab-icon">🪟</span>
            視窗
          </button>
          <button
            className={`tab-button ${activeTab === 'region' ? 'active' : ''}`}
            onClick={() => setActiveTab('region')}
          >
            <span className="tab-icon">⬚</span>
            區域
          </button>
        </div>

        {/* 來源列表 */}
        <div className="source-picker-content">
          {loading ? (
            <div className="loading-state">載入中...</div>
          ) : activeTab === 'region' ? (
            <div className="region-info">
              <div className="region-icon">⬚</div>
              <p>點擊「確定選擇」後，將可以在螢幕上框選要錄製的區域。</p>
              <p className="region-hint">提示：拖曳滑鼠來選擇區域，按 ESC 取消</p>
            </div>
          ) : (
            <div className="source-grid">
              {filteredSources.map((source) => (
                <div
                  key={source.id}
                  className={`source-item ${selectedSourceId === source.id ? 'selected' : ''}`}
                  onClick={() => setSelectedSourceId(source.id)}
                >
                  <div className="source-thumbnail">
                    {source.thumbnail ? (
                      <img src={source.thumbnail} alt={source.name} />
                    ) : (
                      <div className="no-thumbnail">
                        {source.type === 'screen' ? '🖥️' : '🪟'}
                      </div>
                    )}
                  </div>
                  <div className="source-info">
                    {source.appIcon && (
                      <img className="app-icon" src={source.appIcon} alt="" />
                    )}
                    <span className="source-name">{source.name}</span>
                  </div>
                </div>
              ))}
              {filteredSources.length === 0 && (
                <div className="empty-state">
                  沒有可用的{activeTab === 'screen' ? '螢幕' : '視窗'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 選項 */}
        <div className="source-picker-options">
          <label className="option-checkbox">
            <input
              type="checkbox"
              checked={showCursor}
              onChange={(e) => setShowCursor(e.target.checked)}
            />
            <span>顯示游標</span>
          </label>
          <label className="option-checkbox">
            <input
              type="checkbox"
              checked={enableOverlay}
              onChange={(e) => setEnableOverlay(e.target.checked)}
            />
            <span>白板疊加層</span>
          </label>
        </div>

        {/* 確認按鈕 */}
        <div className="source-picker-footer">
          <button className="cancel-button" onClick={onClose}>
            取消
          </button>
          <button
            className="confirm-button"
            onClick={handleConfirm}
            disabled={activeTab !== 'region' && !selectedSourceId}
          >
            確定選擇
          </button>
        </div>
      </div>
    </div>
  );
};

export default SourcePicker;
