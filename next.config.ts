import type { NextConfig } from 'next'
import { withWorkflow } from 'workflow/next'

const nextConfig: NextConfig = {
	serverExternalPackages: [
		'just-bash',
		'bash-tool',
		'@mastra/core',
		'@mastra/memory',
		'@mastra/libsql',
		'@mastra/pg',
		'@mastra/client',
	],
}

export default withWorkflow(nextConfig)
