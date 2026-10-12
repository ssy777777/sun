/* ============================================================
 * 云排行榜配置（Supabase）
 * ------------------------------------------------------------
 * 只填这两个值即可启用排行榜；留空 = 排行榜自动“未启用”，
 * 游戏本体照常运行，本地最高分也照常保存。
 *
 * 怎么拿到这两个值：
 *   1. 打开 https://supabase.com 注册（免费），New project
 *   2. 进项目 → 左下 Settings → API
 *      - Project URL        → 填到下面的 url
 *      - Project API keys 里的 anon / public key → 填到 anonKey
 *   3. 在左侧 SQL Editor 里执行《排行榜接入.md》中的建表 SQL
 *
 * 注意：anon key 本来就是给前端用的公开串，可以直接提交到仓库；
 *      绝对不要填 service_role key（那个能删库）。
 * ============================================================ */
window.SUN_CLOUD = {
    url: '',        // 例如 'https://abcdefghijk.supabase.co'
    anonKey: ''     // 例如 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
