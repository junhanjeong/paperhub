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

        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error("댓글 불러오기 실패:", e);
        return [];
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
                password: comment.password, // 실제 서비스 시에는 bcrypt 등으로 암호화 권장
            }]);

        if (error) throw error;
        revalidatePath("/");
        return { success: true };
    } catch (e) {
        console.error("댓글 작성 실패:", e);
        return { success: false };
    }
}

export async function deleteCommentAction(commentId: string, password: string) {
    try {
        // 1. 비밀번호 확인
        const { data: comment, error: fetchError } = await supabase
            .from('comments')
            .select('password')
            .eq('id', commentId)
            .single();

        if (fetchError || !comment) throw new Error("댓글을 찾을 수 없습니다.");

        if (comment.password !== password) {
            return { success: false, message: "비밀번호가 틀렸습니다." };
        }

        // 2. 삭제
        const { error: deleteError } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);

        if (deleteError) throw deleteError;

        revalidatePath("/");
        return { success: true };
    } catch (e: any) {
        console.error("댓글 삭제 실패:", e);
        return { success: false, message: e.message };
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
    // 실제 서비스에서는 IP 기반이나 User ID 기반으로 중복 방지 로직 필요
    try {
        const { data, error } = await supabase
            .from('likes')
            .upsert({ tool_id: toolId, count: currentLikes + 1 }, { onConflict: 'tool_id' });

        if (error) throw error;
        revalidatePath("/");
    } catch (e) {
        console.error("좋아요 업데이트 실패:", e);
    }
}
