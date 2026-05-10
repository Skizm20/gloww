document.addEventListener('DOMContentLoaded', () => {
    const items = document.querySelectorAll('[data-timeline-item]');
    const progressBar = document.getElementById('timeline-progress');
    const stickyWrapper = document.querySelector('.sticky-wrapper');
    const horizontalScroller = document.getElementById('horizontal-scroller');
    let scrollTimeout;
    let targetProgress = 0;
    let currentProgress = 0;
    const lerpAmount = 0.03; // Even smoother
    
    const lerp = (start, end, amt) => (1 - amt) * start + amt * end;

    let wrapperTop = 0, wrapperHeight = 0, windowHeight = 0, maxTranslate = 0, N = 1;
    let isAnimating = false;

    const calculateDimensions = () => {
        if (!stickyWrapper || !horizontalScroller) return;
        const rect = stickyWrapper.getBoundingClientRect();
        wrapperTop = rect.top + window.scrollY;
        wrapperHeight = stickyWrapper.offsetHeight;
        windowHeight = window.innerHeight;
        maxTranslate = horizontalScroller.scrollWidth - window.innerWidth;
        const videoItems = document.querySelectorAll('.carousel-item');
        N = Math.max(1, videoItems.length - 1);
    };
    
    calculateDimensions();
    window.addEventListener('resize', calculateDimensions);
    
    const updateTimelineProgress = () => {
        const timelineProgressBar = document.getElementById('timeline-progress');
        const timelineTrack = document.getElementById('timeline-track');
        if (!timelineTrack || !timelineProgressBar) return;
        
        const trackRect = timelineTrack.getBoundingClientRect();
        const center = windowHeight / 2;
        
        let progress = (center - trackRect.top) / trackRect.height;
        progress = Math.max(0, Math.min(1, progress));
        
        timelineProgressBar.style.height = `${progress * 100}%`;

        // Efficient dot activation: only check items that are likely visible
        items.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            // Only proceed if the item is somewhat in the viewport vertical range
            if (itemRect.bottom < 0 || itemRect.top > windowHeight) return;

            const dot = item.querySelector('.timeline-dot');
            const contentElements = item.querySelectorAll('.timeline-content');
            const itemTriggerPoint = itemRect.top + itemRect.height / 2;
            
            if (itemTriggerPoint <= center) {
                if (!dot.classList.contains('active')) {
                    dot.classList.add('active');
                    contentElements.forEach(c => c.classList.add('active'));
                }
            } else {
                if (dot.classList.contains('active')) {
                    dot.classList.remove('active');
                    contentElements.forEach(c => c.classList.remove('active'));
                }
            }
        });
    };

    const handleScroll = () => {
        handleCarouselScroll();
        updateTimelineProgress();
    };

    const handleCarouselScroll = () => {
        if (!wrapperHeight) return;
        
        let rawProgress = (window.scrollY - wrapperTop) / (wrapperHeight - windowHeight);
        rawProgress = Math.max(0, Math.min(1, rawProgress));
        
        // Calculate snapped progress to add pauses at each video
        const pauseSize = 0.1; // Increased for slower feel
        
        let progress = rawProgress;
        for (let i = 0; i <= N; i++) {
            const snapPoint = i / N;
            
            if (Math.abs(rawProgress - snapPoint) <= pauseSize) {
                progress = snapPoint;
                break;
            } 
            
            if (i < N && rawProgress > snapPoint + pauseSize && rawProgress < (i + 1) / N - pauseSize) {
                const startX = snapPoint + pauseSize;
                const endX = (i + 1) / N - pauseSize;
                const startY = snapPoint;
                const endY = (i + 1) / N;
                
                const ratio = (rawProgress - startX) / (endX - startX);
                progress = startY + ratio * (endY - startY);
                break;
            }
        }
        
        targetProgress = progress;
    };
    
    const smoothUpdate = () => {
        const delta = targetProgress - currentProgress;
        
        if (Math.abs(delta) > 0.0001) {
            currentProgress = lerp(currentProgress, targetProgress, lerpAmount);
            horizontalScroller.style.transform = `translate3d(${-currentProgress * maxTranslate}px, 0, 0)`;
            requestAnimationFrame(smoothUpdate);
            isAnimating = true;
        } else {
            currentProgress = targetProgress;
            horizontalScroller.style.transform = `translate3d(${-currentProgress * maxTranslate}px, 0, 0)`;
            isAnimating = false;
        }
    };
    
    const startAnimation = () => {
        if (!isAnimating) {
            isAnimating = true;
            requestAnimationFrame(smoothUpdate);
        }
    };
    
    window.addEventListener('scroll', () => {
        handleScroll();
        startAnimation();
    }, { passive: true });

    // Wheel event logic for discrete "one video per scroll"
    let isWheeling = false;
    window.addEventListener('wheel', (e) => {
        if (!stickyWrapper || !wrapperHeight) return;
        
        const currentRectTop = wrapperTop - window.scrollY;
        const currentRectBottom = wrapperTop + wrapperHeight - window.scrollY;
        const maxScrollY = wrapperTop + wrapperHeight - windowHeight;
        
        if (currentRectTop <= 0 && currentRectBottom >= windowHeight) {
            const atTop = window.scrollY <= wrapperTop + 5;
            const atBottom = window.scrollY >= maxScrollY - 5;
            
            if (atTop && e.deltaY < 0) return;
            if (atBottom && e.deltaY > 0) return;
            
            e.preventDefault();
            
            if (isWheeling) return;
            isWheeling = true;
            
            const rawProgress = (window.scrollY - wrapperTop) / (maxScrollY - wrapperTop);
            let currentIndex = Math.round(rawProgress * N);
            
            if (e.deltaY > 0) {
                currentIndex = Math.min(N, currentIndex + 1);
            } else {
                currentIndex = Math.max(0, currentIndex - 1);
            }
            
            const targetScrollY = wrapperTop + (currentIndex / N) * (maxScrollY - wrapperTop);
            
            window.scrollTo({
                top: targetScrollY,
                behavior: 'smooth'
            });
            
            setTimeout(() => { isWheeling = false; }, 800); // Reduced timeout for better responsiveness
        }
    }, { passive: false });

    // Enhanced Video Player Controls
    const videoItems = document.querySelectorAll('[data-video-item]');
    videoItems.forEach(item => {
        const video = item.querySelector('video');
        const playBtn = item.querySelector('.video-play-btn');
        const playPauseBtn = item.querySelector('.video-play-pause-btn');
        const playIcon = item.querySelector('.play-icon');
        const pauseIcon = item.querySelector('.pause-icon');
        const progressContainer = item.querySelector('.progress-container');
        const progressBar = item.querySelector('.progress-bar');
        const progressFill = item.querySelector('.progress-fill');
        const progressHandle = item.querySelector('.progress-handle');
        const currentTimeEl = item.querySelector('.current-time');
        const durationTimeEl = item.querySelector('.duration-time');
        const volumeBtn = item.querySelector('.volume-btn');
        const volumeSlider = item.querySelector('.volume-slider');
        const volumeFill = item.querySelector('.volume-fill');
        const videoControls = item.querySelector('.video-controls');
        const videoTitle = item.querySelector('.video-title');
        let isDraggingProgress = false;
        let controlsTimeout;
        let lastVolumeBeforeMute = 0.5;

        // Format time as MM:SS
        const formatTime = (seconds) => {
            if (!seconds || isNaN(seconds)) return '0:00';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        // Update buffered progress indicator
        const updateBufferedProgress = () => {
            if (video.buffered.length > 0) {
                const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                const bufferedPercent = (bufferedEnd / video.duration) * 100;
                // Add buffered indicator (semi-transparent)
                progressBar.style.background = `linear-gradient(to right, rgba(107, 114, 128, 0.5) 0%, rgba(107, 114, 128, 0.5) ${bufferedPercent}%, rgba(75, 85, 99, 1) ${bufferedPercent}%, rgba(75, 85, 99, 1) 100%)`;
            }
        };

        // Auto-hide controls on mouse move
        let isControlsVisible = false;
        const showControls = () => {
            if (!video.paused) {
                if (!isControlsVisible) {
                    videoControls.classList.add('show');
                    playBtn.classList.add('hidden');
                    videoTitle.style.opacity = '0';
                    isControlsVisible = true;
                }
                clearTimeout(controlsTimeout);
                controlsTimeout = setTimeout(() => {
                    if (!video.paused) {
                        videoControls.classList.remove('show');
                        isControlsVisible = false;
                    }
                }, 3000);
            }
        };

        item.addEventListener('mousemove', showControls);
        item.addEventListener('mouseleave', () => {
            clearTimeout(controlsTimeout);
            if (!video.paused) {
                videoControls.classList.remove('show');
            }
        });

        // Play/Pause on play button click
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            videoItems.forEach(v => {
                const vid = v.querySelector('video');
                if (vid !== video) vid.pause();
            });
            video.play();
            playBtn.classList.add('hidden');
            videoControls.classList.add('show');
        });

        // Click anywhere on item to play/pause
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            if (video.paused) {
                videoItems.forEach(v => {
                    const vid = v.querySelector('video');
                    if (vid !== video) vid.pause();
                });
                video.play();
            } else {
                video.pause();
            }
        });

        // Double-click anywhere on item for fullscreen
        item.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (!document.fullscreenElement) {
                item.requestFullscreen().catch(err => console.log('Fullscreen error:', err));
            } else {
                document.exitFullscreen();
            }
        });

        // Prevent controls clicks from bubbling
        videoControls.addEventListener('click', (e) => e.stopPropagation());
        videoControls.addEventListener('dblclick', (e) => e.stopPropagation());

        // Play/Pause button in controls
        playPauseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (video.paused) {
                videoItems.forEach(v => {
                    const vid = v.querySelector('video');
                    if (vid !== video) vid.pause();
                });
                video.play();
                playIcon.classList.add('hidden');
                pauseIcon.classList.remove('hidden');
            } else {
                video.pause();
                playIcon.classList.remove('hidden');
                pauseIcon.classList.add('hidden');
            }
        });

        // Update progress bar and buffered indicator
        video.addEventListener('timeupdate', () => {
            if (video.duration) {
                const percent = (video.currentTime / video.duration) * 100;
                progressFill.style.width = percent + '%';
                progressHandle.style.left = percent + '%';
                currentTimeEl.textContent = formatTime(video.currentTime);
            }
        });

        video.addEventListener('progress', updateBufferedProgress);

        // Set duration
        video.addEventListener('loadedmetadata', () => {
            durationTimeEl.textContent = formatTime(video.duration);
            updateBufferedProgress();
        });

        // Progress bar click
        progressContainer.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            video.currentTime = percent * video.duration;
        });

        // Progress bar drag
        progressHandle.addEventListener('mousedown', () => {
            isDraggingProgress = true;
        });

        document.addEventListener('mousemove', (e) => {
            if (isDraggingProgress && progressBar) {
                const rect = progressBar.getBoundingClientRect();
                const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                video.currentTime = percent * video.duration;
            }
        });

        document.addEventListener('mouseup', () => {
            isDraggingProgress = false;
        });

        // Volume slider visibility on hover
        const volumeControl = item.querySelector('.volume-control');
        volumeControl.addEventListener('mouseenter', () => {
            volumeSlider.classList.add('show');
        });
        volumeControl.addEventListener('mouseleave', () => {
            if (!isDraggingVolume) {
                volumeSlider.classList.remove('show');
            }
        });

        // Volume button toggle (mute/unmute)
        volumeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (video.volume === 0) {
                video.volume = lastVolumeBeforeMute || 0.5;
                volumeFill.style.width = (video.volume * 100) + '%';
            } else {
                lastVolumeBeforeMute = video.volume;
                video.volume = 0;
                volumeFill.style.width = '0%';
            }
        });

        // Volume slider interactions
        let isDraggingVolume = false;

        const updateVolume = (e) => {
            const rect = volumeSlider.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            video.volume = percent;
            volumeFill.style.width = (percent * 100) + '%';
            lastVolumeBeforeMute = percent;
        };

        volumeSlider.addEventListener('mousedown', (e) => {
            isDraggingVolume = true;
            updateVolume(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (isDraggingVolume) {
                updateVolume(e);
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDraggingVolume) {
                isDraggingVolume = false;
                // Optionally hide slider if mouse is not over volume control
                if (!volumeControl.matches(':hover')) {
                    volumeSlider.classList.remove('show');
                }
            }
        });



        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            // Only control video if it's in focus or hovered
            const videoInFocus = item.contains(document.activeElement) || document.elementFromPoint(item.getBoundingClientRect().left + 10, item.getBoundingClientRect().top + 10) === video;
            
            if (!videoInFocus && e.target !== document.body) return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    if (video.paused) {
                        videoItems.forEach(v => {
                            const vid = v.querySelector('video');
                            if (vid !== video) vid.pause();
                        });
                        video.play();
                    } else {
                        video.pause();
                    }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    video.currentTime = Math.max(0, video.currentTime - 5);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    video.currentTime = Math.min(video.duration, video.currentTime + 5);
                    break;
                case 'KeyJ':
                    e.preventDefault();
                    video.currentTime = Math.max(0, video.currentTime - 10);
                    break;
                case 'KeyL':
                    e.preventDefault();
                    video.currentTime = Math.min(video.duration, video.currentTime + 10);
                    break;
                case 'KeyM':
                    e.preventDefault();
                    if (video.volume === 0) {
                        video.volume = lastVolumeBeforeMute;
                        volumeFill.style.width = (lastVolumeBeforeMute * 100) + '%';
                    } else {
                        lastVolumeBeforeMute = video.volume;
                        video.volume = 0;
                        volumeFill.style.width = '0%';
                    }
                    break;
                case 'KeyF':
                    e.preventDefault();
                    if (!document.fullscreenElement) {
                        item.requestFullscreen().catch(err => console.log('Fullscreen error:', err));
                    } else {
                        document.exitFullscreen();
                    }
                    break;
                case 'Digit0':
                case 'Digit1':
                case 'Digit2':
                case 'Digit3':
                case 'Digit4':
                case 'Digit5':
                case 'Digit6':
                case 'Digit7':
                case 'Digit8':
                case 'Digit9':
                    e.preventDefault();
                    const percent = parseInt(e.code.replace('Digit', '')) / 10;
                    video.currentTime = percent * video.duration;
                    break;
            }
        });

        // Hide controls and title on pause
        video.addEventListener('pause', () => {
            playBtn.classList.remove('hidden');
            videoControls.classList.add('show');
            videoTitle.style.opacity = '0';
            videoTitle.style.pointerEvents = 'auto';
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        });

        // Pause other videos and hide title when playing
        video.addEventListener('play', () => {
            videoItems.forEach(v => {
                const vid = v.querySelector('video');
                if (vid !== video) vid.pause();
            });
            playBtn.classList.add('hidden');
            videoControls.classList.add('show');
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
            videoTitle.style.opacity = '0';
            videoTitle.style.pointerEvents = 'none';
        });

        // Set initial volume fill
        volumeFill.style.width = (video.volume * 100) + '%';
        lastVolumeBeforeMute = video.volume;
    });

    // IntersectionObserver removed to use scroll-driven activation for better reliability

    const updateTimelineTrackHeight = () => {
        const track = document.getElementById('timeline-track');
        if (!track || items.length === 0) return;
        const container = items[0].parentElement;
        const containerRect = container.getBoundingClientRect();
        const lastDot = items[items.length - 1].querySelector('.timeline-dot');
        if (lastDot) {
            const dotRect = lastDot.getBoundingClientRect();
            const distance = (dotRect.top - containerRect.top) + (dotRect.height / 2);
            track.style.height = `${distance}px`;
        }
    };
    
    // Call it initially and update on resize
    updateTimelineTrackHeight();
    window.addEventListener('resize', updateTimelineTrackHeight);
});
