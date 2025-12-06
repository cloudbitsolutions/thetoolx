import React, { useEffect, useRef, useState } from "react";

type Tool = {
    id: number;
    name: string;
    slug?: string;
    isActive?: boolean;
    icon?: string | null;
};

type Review = {
    id: number;
    toolId: number;
    userId: string;
    rating: number;
    comment?: string | null;
    isApproved: boolean;
    createdAt?: string;
};

type UserShort = {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
};

export default function AdminViewReviews() {
    const [tools, setTools] = useState<Tool[]>([]);
    const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loadingTools, setLoadingTools] = useState(false);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [usersCache, setUsersCache] = useState<Record<string, UserShort>>({});
    const reviewsRef = useRef<HTMLDivElement | null>(null); // new ref

    useEffect(() => {
        fetchTools();
    }, []);

    const fetchTools = async () => {
        setLoadingTools(true);
        try {
            const res = await fetch("/api/tools");
            const data: Tool[] = await res.json();
            setTools(data.filter((t) => (t as any).isActive !== false));
        } catch (err) {
            console.error("Failed to load tools", err);
        } finally {
            setLoadingTools(false);
        }
    };

    const loadReviewsForTool = async (tool: Tool) => {
        setSelectedTool(tool);
        setReviews([]);
        setLoadingReviews(true);
        try {
            const res = await fetch(`/api/admin/tools/${tool.id}/reviews`);
            const data = await res.json();

            const reviewsArray: Review[] = Array.isArray(data) ? data : [];
            setReviews(reviewsArray);

            const userIds = Array.from(new Set(reviewsArray.map((r) => r.userId)));
            for (const uid of userIds) {
                if (!usersCache[uid]) {
                    fetchUser(uid);
                }
            }

            // ✅ Scroll into view on mobile
            setTimeout(() => {
                if (window.innerWidth < 768 && reviewsRef.current) {
                    reviewsRef.current.scrollIntoView({ behavior: "smooth" });
                }
            }, 100); // small delay ensures DOM is rendered
        } catch (err) {
            console.error("Failed to load reviews", err);
        } finally {
            setLoadingReviews(false);
        }
    };


    const fetchUser = async (userId: string) => {
        try {
            const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`);
            if (!res.ok) return;
            const u = await res.json();
            setUsersCache((s) => ({ ...s, [userId]: u }));
        } catch (err) {
            console.error("Failed to load user", err);
        }
    };

    const toggleApprove = async (review: Review) => {
        try {
            const res = await fetch(`/api/admin/reviews/${review.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isApproved: !review.isApproved }),
            });
            if (!res.ok) {
                console.error("Approve failed", await res.text());
                return;
            }
            const updated: Review = await res.json();
            setReviews((r) => r.map((rv) => (rv.id === updated.id ? updated : rv)));
        } catch (err) {
            console.error("Failed to update review", err);
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8">
            <h2 className="text-2xl font-semibold mb-4">View Reviews</h2>
            <div className="flex flex-col md:flex-row gap-6">
                {/* Left: tools list */}
                <aside className="w-full md:w-1/3">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 h-full">
                        <h3 className="font-medium mb-3">Tools</h3>
                        {loadingTools ? (
                            <p className="text-sm text-gray-500">Loading tools...</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {tools.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => loadReviewsForTool(t)}
                                        className={`text-left p-3 rounded-lg w-full transition border ${selectedTool?.id === t.id
                                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                                            : "border-gray-200 dark:border-gray-700"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-medium">{t.name}</div>
                                                <div className="text-xs text-gray-500">{t.slug}</div>
                                            </div>
                                            <div className="text-xs text-gray-400">{/* optional icon */}</div>
                                        </div>
                                    </button>
                                ))}
                                {tools.length === 0 && <div className="text-sm text-gray-500">No active tools found.</div>}
                            </div>
                        )}
                    </div>
                </aside>

                {/* Right: reviews */}
                <main className="w-full md:w-2/3" ref={reviewsRef}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <h3 className="font-medium mb-3">
                            {selectedTool ? `Reviews for "${selectedTool.name}"` : "Select a tool to view reviews"}
                        </h3>

                        {loadingReviews && <p className="text-sm text-gray-500">Loading reviews...</p>}

                        {!loadingReviews && selectedTool && reviews.length === 0 && (
                            <p className="text-sm text-gray-500">No reviews for this tool yet.</p>
                        )}

                        <div className="space-y-4">
                            {Array.isArray(reviews) &&
                                reviews.map((r) => {
                                    const user = usersCache[r.userId];
                                    const username = user
                                        ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || user.id || "Unknown User"
                                        : "Unknown User";

                                    return (
                                        <div
                                            key={r.id}
                                            className="border rounded-lg p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-3"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="text-sm font-medium">{username}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                                                    </div>
                                                </div>
                                                <div className="text-sm mb-2">Rating: {r.rating} / 5</div>
                                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                                    {r.comment || <em>No comment</em>}
                                                </div>
                                                <div className="mt-2">
                                                    <span
                                                        className={`inline-block px-2 py-1 text-xs rounded ${r.isApproved
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-yellow-100 text-yellow-800"
                                                            }`}
                                                    >
                                                        {r.isApproved ? "Approved" : "Pending"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex-shrink-0 flex items-center gap-2">
                                                <button
                                                    onClick={() => toggleApprove(r)}
                                                    className={`px-3 py-1 rounded text-sm font-medium ${r.isApproved
                                                        ? "bg-red-600 text-white hover:bg-red-700"
                                                        : "bg-green-600 text-white hover:bg-green-700"
                                                        }`}
                                                    aria-label={r.isApproved ? "Unapprove review" : "Approve review"}
                                                >
                                                    {r.isApproved ? "Unapprove" : "Approve"}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
