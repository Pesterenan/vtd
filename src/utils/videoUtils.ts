import type { FfprobeData } from "fluent-ffmpeg";
import ffmpeg, { ffprobe } from "fluent-ffmpeg";
import type { IVideoMetadata } from "src/types";
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
    console.log("iniciando análise de video:", filePath);
    ffprobe(filePath, (err: Error, metadata: FfprobeData) => {
      if (err) {
        console.error("Erro no ffprobe:", err);
        return reject(err);
      }
      try {
        const duration = metadata.format.duration;
        const width = metadata.streams[0].width;
        const height = metadata.streams[0].height;
        const frameRate = metadata.streams[0].r_frame_rate;
        const totalFrames = Math.floor(
          Number(duration) * Number(frameRate?.split("/")[0]),
        );
        console.log(`Duração: ${duration} segundos`);
        console.log(`Resolução: ${width}x${height}`);
        console.log(`Taxa de quadros: ${frameRate}`);
        console.log(`Quadros totais: ${totalFrames}`);
        if (duration && width && height && frameRate && totalFrames) {
          const parsedMetadata: IVideoMetadata = {
            filePath,
            duration,
            width,
            height,
            frameRate,
            totalFrames,
          };
          console.log("Metadados obtidos:", parsedMetadata);
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
