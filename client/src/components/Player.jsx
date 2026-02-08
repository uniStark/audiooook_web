import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  HiChevronDown, 
  HiPlay, HiPause,
  HiBackward, HiForward,
  HiArrowUturnLeft, HiArrowUturnRight,
  HiQueueList,
  HiHeart, HiOutlineHeart,
} from 'react-icons/hi2';
import usePlayerStore from '../stores/playerStore';
import useBookStore from '../stores/bookStore';
import { bookApi } from '../utils/api';
import { formatTime } from '../utils/format';
import { useState, useEffect, useRef } from 'react';

export default function Player() {
  const navigate = useNavigate();
  const {
    currentBook, currentSeason, currentEpisode,
    currentSeasonIndex, currentEpisodeIndex,
    isPlaying, currentTime, duration, isLoading, bookDetail,
    togglePlay, seekTo, seekRelative, playNext, playPrev,
    playEpisode,
  } = usePlayerStore();
  
  const { checkFavorite, toggleFavorite } = useBookStore();
  const [isFav, setIsFav] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const progressRef = useRef(null);

  useEffect(() => {
    if (currentBook) {
      checkFavorite(currentBook.id).then(setIsFav);
    }
  }, [currentBook]);

  if (!currentBook || !currentEpisode) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-screen">
        <div className="text-6xl mb-4">🎧</div>
        <p className="text-dark-400 text-lg">暂无播放内容</p>
        <button 
          onClick={() => navigate('/')} 
          className="btn-primary mt-6"
        >
          去书架选择
        </button>
      </div>
    );
  }

  const handleToggleFav = async () => {
    if (currentBook) {
      await toggleFavorite(currentBook);
      setIsFav(!isFav);
    }
  };

  const displayTime = isDragging ? dragTime : currentTime;
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0;

  // 拖拽进度条
  const handleProgressTouch = (e) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    return percentage * duration;
  };

  const onTouchStart = (e) => {
    setIsDragging(true);
    const time = handleProgressTouch(e);
    if (time !== undefined) setDragTime(time);
  };

  const onTouchMove = (e) => {
    if (!isDragging) return;
    const time = handleProgressTouch(e);
    if (time !== undefined) setDragTime(time);
  };

  const onTouchEnd = () => {
    if (isDragging) {
      seekTo(dragTime);
      setIsDragging(false);
    }
  };

  // 集列表选择
  const handleSelectEpisode = (sIndex, eIndex) => {
    playEpisode(currentBook, sIndex, eIndex);
    setShowEpisodes(false);
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-dark-950 flex flex-col"
    >
      {/* 背景模糊封面 */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={bookApi.getCoverUrl(currentBook.id)}
          alt=""
          className="w-full h-full object-cover opacity-10 blur-3xl scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-dark-950/50 via-dark-950/80 to-dark-950" />
      </div>

      {/* 内容区 */}
      <div className="relative flex flex-col h-full max-w-lg mx-auto w-full">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between p-4">
          <button 
            onClick={() => navigate(-1)} 
            className="btn-ghost p-2"
          >
            <HiChevronDown className="w-7 h-7" />
          </button>
          <div className="text-center flex-1 px-4">
            <p className="text-xs text-dark-400 truncate">{currentBook.name}</p>
            <p className="text-xs text-dark-500 truncate mt-0.5">{currentSeason?.name}</p>
          </div>
          <button onClick={handleToggleFav} className="btn-ghost p-2">
            {isFav ? (
              <HiHeart className="w-6 h-6 text-red-500" />
            ) : (
              <HiOutlineHeart className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* 封面区域 */}
        <div className="flex-1 flex items-center justify-center px-12 py-4">
          <motion.div
            animate={{ rotate: isPlaying ? 360 : 0 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="w-64 h-64 rounded-full overflow-hidden shadow-2xl shadow-black/50 border-4 border-dark-700/30"
          >
            <img
              src={bookApi.getCoverUrl(currentBook.id)}
              alt={currentBook.name}
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>

        {/* 集信息 */}
        <div className="px-8 mb-4">
          <h2 className="text-lg font-bold text-white truncate">
            {currentEpisode.name}
          </h2>
          <p className="text-sm text-dark-400 mt-1 truncate">
            {currentBook.name}
            {bookDetail && bookDetail.seasons.length > 1 && ` · ${currentSeason?.name}`}
          </p>
          {bookDetail && (
            <p className="text-xs text-dark-500 mt-1">
              第 {currentEpisodeIndex + 1} / {currentSeason?.episodes?.length || 0} 集
              {bookDetail.seasons.length > 1 && ` · 第 ${currentSeasonIndex + 1} / ${bookDetail.seasons.length} 季`}
            </p>
          )}
        </div>

        {/* 进度条 */}
        <div className="px-8 mb-4">
          <div 
            ref={progressRef}
            className="relative h-8 flex items-center cursor-pointer"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onTouchStart}
            onMouseMove={(e) => { if (isDragging) onTouchMove(e); }}
            onMouseUp={onTouchEnd}
            onMouseLeave={onTouchEnd}
          >
            {/* 轨道 */}
            <div className="w-full h-1 bg-dark-700 rounded-full relative">
              {/* 已播放 */}
              <div 
                className="absolute left-0 top-0 h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${progress}%`, transition: isDragging ? 'none' : 'width 0.3s' }}
              />
              {/* 拖拽指示器 */}
              <div 
                className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary-500 shadow-lg shadow-primary-500/30 transition-all ${isDragging ? 'scale-150' : ''}`}
                style={{ left: `calc(${progress}% - 8px)`, transition: isDragging ? 'none' : 'left 0.3s' }}
              />
            </div>
          </div>
          <div className="flex justify-between text-xs text-dark-500 -mt-1">
            <span>{formatTime(displayTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* 播放控制 */}
        <div className="px-8 mb-8">
          <div className="flex items-center justify-between">
            {/* 快退15s */}
            <button 
              onClick={() => seekRelative(-15)} 
              className="relative btn-ghost p-3 group"
            >
              <HiArrowUturnLeft className="w-6 h-6 group-active:scale-90 transition-transform" />
              <span className="absolute top-1 right-1 text-[8px] text-dark-400 font-bold">15</span>
            </button>
            
            {/* 上一集 */}
            <button 
              onClick={playPrev} 
              className="btn-ghost p-3"
            >
              <HiBackward className="w-8 h-8" />
            </button>
            
            {/* 播放/暂停 */}
            <button 
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-primary-500 text-dark-900 flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-primary-500/30"
            >
              {isLoading ? (
                <div className="w-8 h-8 border-3 border-dark-900/30 border-t-dark-900 rounded-full animate-spin" />
              ) : isPlaying ? (
                <HiPause className="w-8 h-8" />
              ) : (
                <HiPlay className="w-8 h-8 ml-1" />
              )}
            </button>
            
            {/* 下一集 */}
            <button 
              onClick={playNext} 
              className="btn-ghost p-3"
            >
              <HiForward className="w-8 h-8" />
            </button>
            
            {/* 快进15s */}
            <button 
              onClick={() => seekRelative(15)} 
              className="relative btn-ghost p-3 group"
            >
              <HiArrowUturnRight className="w-6 h-6 group-active:scale-90 transition-transform" />
              <span className="absolute top-1 right-1 text-[8px] text-dark-400 font-bold">15</span>
            </button>
          </div>
        </div>

        {/* 集列表按钮 */}
        <div className="px-8 mb-8">
          <button
            onClick={() => setShowEpisodes(!showEpisodes)}
            className="w-full flex items-center justify-center gap-2 text-dark-400 hover:text-white py-2 transition-colors"
          >
            <HiQueueList className="w-5 h-5" />
            <span className="text-sm">播放列表</span>
          </button>
        </div>
      </div>

      {/* 集列表面板 */}
      {showEpisodes && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          className="fixed bottom-0 left-0 right-0 z-60 bg-dark-900 rounded-t-3xl max-h-[60vh] overflow-hidden"
        >
          <div className="max-w-lg mx-auto">
            <div className="sticky top-0 bg-dark-900 p-4 border-b border-dark-700/50 flex items-center justify-between">
              <h3 className="font-semibold">播放列表</h3>
              <button onClick={() => setShowEpisodes(false)} className="text-dark-400 text-sm">
                关闭
              </button>
            </div>
            <div className="overflow-y-auto max-h-[50vh] pb-safe">
              {bookDetail?.seasons.map((season, sIndex) => (
                <div key={season.id}>
                  {bookDetail.seasons.length > 1 && (
                    <div className="px-4 py-2 bg-dark-800/50 text-xs text-dark-400 font-medium sticky top-0">
                      {season.name}
                    </div>
                  )}
                  {season.episodes.map((ep, eIndex) => {
                    const isCurrent = currentEpisode?.id === ep.id;
                    return (
                      <button
                        key={ep.id}
                        onClick={() => handleSelectEpisode(sIndex, eIndex)}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                          isCurrent ? 'bg-primary-500/10 text-primary-500' : 'text-dark-300 hover:bg-dark-800'
                        }`}
                      >
                        <span className={`text-xs w-8 text-center ${isCurrent ? 'text-primary-500' : 'text-dark-500'}`}>
                          {eIndex + 1}
                        </span>
                        <span className="flex-1 truncate text-sm">{ep.name}</span>
                        {isCurrent && isPlaying && (
                          <div className="flex gap-0.5 items-end h-4">
                            <div className="w-0.5 bg-primary-500 animate-pulse" style={{ height: '40%' }} />
                            <div className="w-0.5 bg-primary-500 animate-pulse" style={{ height: '80%', animationDelay: '0.1s' }} />
                            <div className="w-0.5 bg-primary-500 animate-pulse" style={{ height: '60%', animationDelay: '0.2s' }} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
