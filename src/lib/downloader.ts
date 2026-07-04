import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

export async function downloadYouTube(youtubeUrl: string, projectId: string): Promise<string> {
  const outputPath = path.join(process.cwd(), 'tmp', 'videos', `${projectId}.mp4`)
  
  const command = `yt-dlp -f "best[ext=mp4]/best" --max-filesize 500m -o "${outputPath}" "${youtubeUrl}"`
  
  console.log('Downloading:', youtubeUrl)
  await execAsync(command)
  console.log('Download complete:', outputPath)
  
  return outputPath
}

export async function extractAudio(videoPath: string, projectId: string): Promise<string> {
  const audioPath = path.join(process.cwd(), 'tmp', 'audio', `${projectId}.mp3`)
  
  const command = `ffmpeg -i "${videoPath}" -q:a 0 -map a "${audioPath}" -y`
  
  console.log('Extracting audio...')
  await execAsync(command)
  console.log('Audio extracted:', audioPath)
  
  return audioPath
}
