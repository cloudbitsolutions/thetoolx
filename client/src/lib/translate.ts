export async function translateTool(toolId: number, to: string) {
  const res = await fetch(`/api/translate/tool/${toolId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to }),
  });
  if (!res.ok) throw new Error('Translation failed');
  return res.json();
}

export async function translateBlog(postId: number, to: string) {
  const res = await fetch(`/api/translate/blog/${postId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to }),
  });
  if (!res.ok) throw new Error('Translation failed');
  return res.json();
}
