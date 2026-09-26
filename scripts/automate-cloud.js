/**
 * Automated Cloud Integration Script for GitHub & Supabase
 * Usage: node scripts/automate-cloud.js --github-token <TOKEN> --supabase-url <URL> --supabase-key <KEY>
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function createGitHubRepo(token, repoName = 'secure-library-system') {
  console.log(`[GITHUB] Creating remote repository "${repoName}" via GitHub REST API...`);
  try {
    const res = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'SmartLibrary-Setup-Agent',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: repoName,
        description: 'Secure Smart Library Management System with Next.js, Express & Supabase RLS',
        private: false,
        auto_init: false
      })
    });

    const data = await res.json();
    if (res.status === 201) {
      console.log(`[GITHUB] Successfully created repository: ${data.html_url}`);
      return data;
    } else if (res.status === 422 && data.errors?.[0]?.message?.includes('already exists')) {
      console.log(`[GITHUB] Repository "${repoName}" already exists on GitHub. Proceeding to push.`);
      return { html_url: `https://github.com/vishnukishan111-tech/${repoName}` };
    } else {
      throw new Error(`GitHub API Error (${res.status}): ${JSON.stringify(data)}`);
    }
  } catch (err) {
    console.error('[GITHUB] Error creating repo:', err.message);
    throw err;
  }
}

function pushToGitHub(token, repoName = 'secure-library-system') {
  console.log('[GIT] Configuring remote origin with authentication token...');
  const remoteUrl = `https://${token}@github.com/vishnukishan111-tech/${repoName}.git`;
  try {
    execSync(`git remote set-url origin "${remoteUrl}"`, { stdio: 'inherit' });
  } catch {
    execSync(`git remote add origin "${remoteUrl}"`, { stdio: 'inherit' });
  }

  console.log('[GIT] Pushing main branch to GitHub...');
  execSync('git push -u origin main --force', { stdio: 'inherit' });
  console.log('[GIT] Code successfully pushed to GitHub!');

  // Reset origin URL back to clean HTTPS without token in URL
  execSync(`git remote set-url origin "https://github.com/vishnukishan111-tech/${repoName}.git"`, { stdio: 'inherit' });
}

function updateSupabaseEnv(supabaseUrl, serviceRoleKey, dbUrl = '') {
  console.log('[SUPABASE] Writing production environment credentials...');
  const backendEnvPath = path.join(__dirname, '../backend/.env');
  let backendEnv = fs.existsSync(backendEnvPath) ? fs.readFileSync(backendEnvPath, 'utf8') : '';

  if (dbUrl) {
    backendEnv = backendEnv.replace(/DATABASE_URL=.*/g, `DATABASE_URL=${dbUrl}`);
    backendEnv = backendEnv.replace(/DATABASE_SSL=.*/g, `DATABASE_SSL=true`);
  }

  backendEnv += `\nSUPABASE_URL=${supabaseUrl}\nSUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}\nNEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}\n`;
  fs.writeFileSync(backendEnvPath, backendEnv, 'utf8');

  const frontendEnvPath = path.join(__dirname, '../frontend/.env.local');
  const frontendEnv = `NEXT_PUBLIC_API_URL=http://localhost:5000/api\nNEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}\n`;
  fs.writeFileSync(frontendEnvPath, frontendEnv, 'utf8');

  console.log('[SUPABASE] Environment variables updated successfully.');
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : null;
  };

  const githubToken = getArg('--github-token') || process.env.GITHUB_TOKEN;
  const supabaseUrl = getArg('--supabase-url') || process.env.SUPABASE_URL;
  const supabaseKey = getArg('--supabase-key') || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbUrl = getArg('--db-url') || process.env.DATABASE_URL;

  if (githubToken) {
    await createGitHubRepo(githubToken);
    pushToGitHub(githubToken);
  } else {
    console.log('[INFO] No --github-token provided. Skipping automated GitHub push.');
  }

  if (supabaseUrl && supabaseKey) {
    updateSupabaseEnv(supabaseUrl, supabaseKey, dbUrl);
  } else {
    console.log('[INFO] No Supabase credentials provided. Skipping env update.');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createGitHubRepo, pushToGitHub, updateSupabaseEnv };
