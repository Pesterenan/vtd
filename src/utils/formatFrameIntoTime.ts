/** Using the frame rate and the current frame, formats the time to be displayed in the slider thumb.
 * @param {number} currentFrame - The current frame of the video.
 * @param {number} frameRate - The frame rate of the video.
 * @return {string} - The formatted time string. eg. "00:00:00 [00]"
 */
function formatFrameIntoTime(currentFrame: number, frameRate: number): string {
  const frame = currentFrame % frameRate;
  const seconds = Math.floor(currentFrame / frameRate);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  const formattedFrame = String(frame).padStart(2, "0");
  const formattedSeconds = String(seconds % 60).padStart(2, "0");
  const formattedMinutes = String(minutes % 60).padStart(2, "0");
  const formattedHours = String(hours).padStart(2, "0");

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds} [${formattedFrame}]`;
}

export default formatFrameIntoTime;
