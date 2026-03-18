'use client'
import { useState } from 'react'
import { MessageSquare, ThumbsUp, Pin } from 'lucide-react'

export default function ForumPage() {
  const [newPost, setNewPost] = useState('')

  const posts = [
    { id: 1, author: 'Sunita Devi', title: 'Streetlight not working near Sector 5', content: "The streetlight at the corner of Sector 5 main road has been off for 2 weeks. It's unsafe for women walking at night.", upvotes: 12, comments: 3, time: '3h ago', isPinned: true },
    { id: 2, author: 'Rahul Patel', title: 'Stray dog menace in colony', content: 'Multiple stray dogs are creating problems in our colony. Can the beat officer coordinate with animal control?', upvotes: 8, comments: 5, time: '8h ago', isPinned: false },
    { id: 3, author: 'Anonymous', title: 'Suspicious parking near school', content: 'An unmarked van has been parking near the school gate every afternoon. Parents are concerned.', upvotes: 15, comments: 7, time: '1d ago', isPinned: false },
    { id: 4, author: 'Constable Ramesh', title: '📌 Community Patrol Schedule — March 2026', content: 'Beat patrol schedule for this month has been updated. Morning patrol: 6-8 AM, Evening patrol: 6-8 PM.', upvotes: 20, comments: 2, time: '2d ago', isPinned: true },
  ]

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-2">Community Forum</h1>
      <p className="text-gray-400 text-sm mb-6">Discuss safety concerns with neighbors and your beat officer.</p>

      {/* New post */}
      <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5 mb-6">
        <textarea value={newPost} onChange={e => setNewPost(e.target.value)}
          placeholder="What's on your mind about community safety?"
          rows={3} className="cops-input resize-none mb-3" />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-gray-400 text-xs cursor-pointer">
            <input type="checkbox" className="w-3 h-3" />
            Post anonymously
          </label>
          <button className="cops-btn-primary text-xs px-4 py-2">Post</button>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-3">
        {posts.map(post => (
          <div key={post.id} className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5 hover:border-[#2563EB20] transition-all">
            {post.isPinned && (
              <div className="flex items-center gap-1 text-orange-400 text-xs font-semibold mb-2">
                <Pin className="w-3 h-3" /> Pinned
              </div>
            )}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-[#1A2235] flex items-center justify-center text-xs font-bold text-orange-400">
                {post.author === 'Anonymous' ? '?' : post.author.charAt(0)}
              </div>
              <span className="text-xs text-gray-400">{post.author}</span>
              <span className="text-xs text-gray-600">· {post.time}</span>
            </div>
            <h3 className="text-sm text-white font-medium mb-1">{post.title}</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-3">{post.content}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <button className="flex items-center gap-1 hover:text-orange-400 transition-colors">
                <ThumbsUp className="w-3.5 h-3.5" /> {post.upvotes}
              </button>
              <button className="flex items-center gap-1 hover:text-blue-400 transition-colors">
                <MessageSquare className="w-3.5 h-3.5" /> {post.comments}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
