import type { FfprobeData } from "fluent-ffmpeg";
import ffmpeg, { ffprobe } from "fluent-ffmpeg";
import type { IVideoMetadata } from "src/types";
import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { PassThrough } from "stream";

function streamToBuffer(stream: PassThrough): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export async function processVideoFrame(
  filePath: string,
  timeInSeconds: number,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const stream = new PassThrough();

    ffmpeg(filePath)
      .seekInput(timeInSeconds)
      .frames(1)
      .outputOptions([
        "-f",
        "image2pipe",
        "-pix_fmt",
        "rgba",
        "-vcodec",
        "rawvideo",
      ])
      .on("error", (err) => {
        reject(`Erro ao processar o vídeo: ${err}`);
        stream.end();
      })
      .on("end", () => {
        console.log("Frame extraído com sucesso!");
      })
      .pipe(stream, { end: true });

    const buffer = streamToBuffer(stream);
    resolve(buffer);
  });
}

export async function getMetadata(filePath: string): Promise<IVideoMetadata> {
  return await new Promise((resolve, reject) => {
    ffprobe(filePath, async (err: Error, metadata: FfprobeData) => {
      if (err) {
        console.error("Erro no ffprobe:", err);
        return reject(err);
      }
      try {
        const format = metadata.format.format_name;
        const duration = metadata.format.duration;
        const width = metadata.streams[0].width;
        const height = metadata.streams[0].height;
        const calculateFrameRate = (rate: string) => {
          const [numerator, denominator] = rate.split("/").map(Number);
          return numerator / denominator;
        };
        const frameRate = calculateFrameRate(
          metadata.streams[0].r_frame_rate || "1",
        );
        const totalFrames = Math.floor(Number(duration) * Number(frameRate));
        if (duration && width && height && frameRate && totalFrames) {
          const parsedMetadata: IVideoMetadata = {
            duration,
            filePath,
            format,
            frameRate,
            height,
            totalFrames,
            width,
          };
          resolve(parsedMetadata);
        } else {
          reject(new Error("Couldn't parse video metadata."));
        }
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}

/**
 * Generate a thumbnail sprite for a video file.
 * @param metadata - The metadata of the video file.
 */
export async function generateThumbnailSprite(
  metadata: IVideoMetadata
): Promise<string> {
  const { duration, filePath } = metadata;
  const cols = 10;
  const rows = 10;
  const count = cols * rows;
  const interval = duration / (count);
  const tmpDir = await mkdtemp(join(tmpdir(), "vfe_sprite-"));
  const outFile = join(tmpDir, `thumbnail_sprite.jpg`);
  const time = performance.now();
  await new Promise<void>((resolve, reject) => {
    ffmpeg(filePath)
      .outputOptions([
        `-vf`, `fps=1/${interval},scale=192:-1,tile=${cols}x${rows}`,
        `-frames:v`, `1`
      ])
      .on("error", (err) => reject(err))
      .on("end", () => resolve())
      .save(outFile);
  });
  console.log(`Sprite gerado em ${performance.now() - time}ms`);
  const buf = await readFile(outFile);
  await rm(tmpDir, { recursive: true, force: true });
  const dataUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;
  return dataUrl;
}
