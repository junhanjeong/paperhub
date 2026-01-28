"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "./supabase";

/**
 * [공유 데이터 가이드]
 * 1. Supabase (supabase.com) 가입 후 프로젝트 생성
 * 2. SQL Editor에서 다음 테이블 생성:
 *    
 *    CREATE TABLE comments (
 *      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *      tool_id INT NOT NULL,
 *      nick TEXT NOT NULL,
 *      text TEXT NOT NULL,
 *      password TEXT NOT NULL,
 *      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 *    );
 *
 *    CREATE TABLE likes (
 *      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *      tool_id INT NOT NULL,
 *      count INT DEFAULT 0
 *    );
 * 
 * 3. Vercel 프로젝트 설정에서 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 추가
 */

export async function getCommentsAction(toolId: number) {
    try {
        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .eq('tool_id', toolId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase Error:", error);
            throw new Error("데이터베이스 연결 실패: 댓글을 불러올 수 없습니다.");
        }
        return data || [];
    } catch (e: any) {
        throw e;
    }
}

export async function addCommentAction(toolId: number, comment: any) {
    try {
        const { error } = await supabase
            .from('comments')
            .insert([{
                tool_id: toolId,
                nick: comment.nick,
                text: comment.text,
                password: comment.password,
            }]);

        if (error) {
            console.error("Supabase Error:", error);
            throw new Error("데이터베이스 연결 실패: 댓글을 작성할 수 없습니다.");
        }
        revalidatePath("/");
        return { success: true };
    } catch (e: any) {
        throw e;
    }
}

export async function deleteCommentAction(commentId: string, password: string) {
    try {
        const { data: comment, error: fetchError } = await supabase
            .from('comments')
            .select('password')
            .eq('id', commentId)
            .single();

        if (fetchError || !comment) throw new Error("댓글을 찾을 수 없습니다.");

        if (comment.password !== password) {
            return { success: false, message: "비밀번호가 틀렸습니다." };
        }

        const { error: deleteError } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);

        if (deleteError) throw new Error("데이터베이스 연결 실패: 댓글을 삭제할 수 없습니다.");

        revalidatePath("/");
        return { success: true };
    } catch (e: any) {
        throw e;
    }
}

export async function getCommentCountAction(toolId: number) {
    try {
        const { count, error } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('tool_id', toolId);

        if (error) throw error;
        return count || 0;
    } catch (e) {
        console.error("Count Error:", e);
        return 0;
    }
}

export async function getLikesAction(toolId: number) {
    try {
        const { data, error } = await supabase
            .from('likes')
            .select('count')
            .eq('tool_id', toolId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data?.count || 0;
    } catch (e) {
        return 0;
    }
}

export async function toggleLikeAction(toolId: number, currentLikes: number) {
    try {
        const { error } = await supabase
            .from('likes')
            .upsert({ tool_id: toolId, count: currentLikes + 1 }, { onConflict: 'tool_id' });

        if (error) throw new Error("데이터베이스 연결 실패: 좋아요를 반영할 수 없습니다.");
        revalidatePath("/");
    } catch (e: any) {
        throw e;
    }
}

export async function getAllStatsAction() {
    try {
        // 1. 모든 댓글 개수 가져오기 (tool_id로 그룹화)
        const { data: commentData, error: cError } = await supabase
            .from('comments')
            .select('tool_id');

        if (cError) throw cError;

        const commentCounts: { [key: number]: number } = {};
        commentData?.forEach(c => {
            commentCounts[c.tool_id] = (commentCounts[c.tool_id] || 0) + 1;
        });

        // 2. 모든 좋아요 개수 가져오기
        const { data: likeData, error: lError } = await supabase
            .from('likes')
            .select('tool_id, count');

        if (lError) throw lError;

        const likeCounts: { [key: number]: number } = {};
        likeData?.forEach(l => {
            likeCounts[l.tool_id] = l.count;
        });

        return { commentCounts, likeCounts };
    } catch (e) {
        console.error("Stats Error:", e);
        return { commentCounts: {}, likeCounts: {} };
    }
}
