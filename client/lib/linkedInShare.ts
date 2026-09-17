/**
 * LinkedIn share utility — opens a pre-filled LinkedIn share dialog.
 * LinkedIn's share URL supports `text` (post body) via shareArticle mini param.
 */
export function openLinkedInShare(text: string): void {
  const encoded = encodeURIComponent(text);
  // LinkedIn's share URL with pre-filled text
  const url = `https://www.linkedin.com/sharing/share-offsite/?text=${encoded}`;
  window.open(url, "_blank", "noopener,noreferrer,width=600,height=600");
}
