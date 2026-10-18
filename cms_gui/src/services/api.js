import { anyApi } from 'convex/server';
import { convex, run } from './convex';
import { uploadImage } from '../lib/upload';

// Every section of the CMS goes through `api.endpoints`, backed by the Convex
// functions in convex-backend/convex/. Records use the same field names as the
// website (see content.ts), so components can treat them as before.

const backend = anyApi;

const siteContent = () => run(() => convex.query(backend.content.siteContent, {}));

// Name of the picture argument of each section's create/update mutations.
const IMAGE_ARG = { gallery: 'imageId', startups: 'logoId', news: 'thumbnailId', team: 'photoId' };

function section(id, name, functions) {
  return {
    name,
    list: async (category) => {
      const items = (await siteContent())[id];
      return category ? items.filter((item) => item.category === category) : items;
    },
    count: async () => (await siteContent())[id].length,
    /** Creates (no `itemId`) or updates a record; `file` is a new picture, if any. */
    save: async (itemId, values, file) => {
      const args = { ...values };
      if (file) args[IMAGE_ARG[id]] = await uploadImage(file);
      return run(() =>
        itemId ? convex.mutation(functions.update, { id: itemId, ...args }) : convex.mutation(functions.create, args)
      );
    },
    delete: (itemId) => run(() => convex.mutation(functions.remove, { id: itemId })),
  };
}

const NO_VIDEO = {
  id: null,
  video_name: 'No Background Video Active',
  video_url: null,
  thumbnail_url: null,
  mux_playback_id: null,
  updated_at: null,
};

export const api = {
  endpoints: {
    gallery: section('gallery', 'Gallery', backend.gallery),
    startups: section('startups', 'Startups', backend.startups),
    news: section('news', 'News Updates', backend.news),
    team: section('team', 'Team Members', backend.team),
    backgroundVideo: {
      name: 'Background Video',
      get: async () => (await siteContent()).background_video ?? NO_VIDEO,
      /**
       * Sends the file straight to Mux, then waits until Mux can play it and
       * it has replaced the homepage video. Returns the new video.
       */
      upload: async (file, videoName) => {
        const { uploadId, uploadUrl } = await run(() =>
          convex.action(backend.mux.createUpload, { videoName, corsOrigin: window.location.origin })
        );
        const res = await fetch(uploadUrl, { method: 'PUT', body: file });
        if (!res.ok) throw new Error('The video could not be uploaded. Please try again.');
        await run(() => convex.action(backend.mux.finishUpload, { uploadId }));
        return (await siteContent()).background_video ?? NO_VIDEO;
      },
    },
  },
};
