import { motion } from 'framer-motion';
import { HiPlay, HiSpeakerWave, HiArrowDownTray } from 'react-icons/hi2';
import usePlayerStore from '../stores/playerStore';
import { formatTime } from '../utils/format';
import { useState } from 'react';
import { cacheAudio, getCachedAudio } from '../utils/db';
import { bookApi } from '../utils/api';

export default function EpisodeList({ book, season, seasonIndex, onPlay }) {
  const { currentEpisode, isPlaying } = usePlayerStore();
  const [downloadingId, setDownloadingId] = useState(null);
  const [cachedEpisodes, setCachedEpisodes] = useState(new Set());

  // 检查已缓存的集
  useState(() => {
    (async () => {
      const cached = new Set();
      for (const ep of season.episodes) {
        const key = `${book.id}_${season.id}_${ep.id}`;
        const c = await getCachedAudio(key);
        if (c) cached.add(ep.id);
      }
      setCachedEpisodes(cached);
    })();
  }, [season.id]);

  // 下载到离线缓存
  const handleDownload = async (e, episode) => {
    e.stopPropagation();
    if (downloadingId) return;
    
    setDownloadingId(episode.id);
    try {
      const url = bookApi.getDownloadUrl(book.id, season.id, episode.id);
      const response = await fetch(url);
      const blob = await response.blob();
      
      const key = `${book.id}_${season.id}_${episode.id}`;
      await cacheAudio(key, book.id, blob, {
        episodeName: episode.name,
        seasonName: season.name,
        bookName: book.name,
      });
      
      setCachedEpisodes(prev => new Set([...prev, episode.id]));
    } catch (e) {
      console.error('Download failed:', e);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-1">
      {season.episodes.map((episode, epIndex) => {
        const isCurrent = currentEpisode?.id === episode.id;
        const isCached = cachedEpisodes.has(episode.id);
        
        return (
          <motion.div
            key={episode.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: epIndex * 0.02 }}
            onClick={() => onPlay(seasonIndex, epIndex)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer active:scale-[0.98] ${
              isCurrent 
                ? 'bg-primary-500/10 border border-primary-500/20' 
                : 'hover:bg-dark-700/50'
            }`}
          >
            {/* 播放指示器 */}
            <div className={`w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 ${
              isCurrent ? 'bg-primary-500 text-dark-900' : 'bg-dark-700 text-dark-400'
            }`}>
              {isCurrent && isPlaying ? (
                <HiSpeakerWave className="w-4 h-4 animate-pulse" />
              ) : (
                <HiPlay className="w-4 h-4 ml-0.5" />
              )}
            </div>
            
            {/* 集名称 */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm truncate ${
                isCurrent ? 'text-primary-500 font-medium' : 'text-dark-200'
              }`}>
                {episode.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {isCached && (
                  <span className="text-[10px] text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
                    已缓存
                  </span>
                )}
                {episode.format && (
                  <span className="text-[10px] text-dark-500 uppercase">
                    {episode.format.replace('.', '')}
                  </span>
                )}
              </div>
            </div>
            
            {/* 下载按钮 */}
            <button
              onClick={(e) => handleDownload(e, episode)}
              disabled={isCached || downloadingId === episode.id}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                isCached 
                  ? 'text-green-500 opacity-50 cursor-default' 
                  : 'text-dark-400 hover:text-white hover:bg-dark-600 active:scale-90'
              }`}
            >
              {downloadingId === episode.id ? (
                <div className="w-4 h-4 border-2 border-dark-400/30 border-t-primary-500 rounded-full animate-spin" />
              ) : (
                <HiArrowDownTray className="w-4 h-4" />
              )}
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
