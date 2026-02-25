import { type FileTreeNode, parseFileTreeOutput } from './lib/parse-file-tree'

const output = `
src/index.ts
src/utils.ts
data/sample.json
README.md
`

const tree = parseFileTreeOutput(output)

function printTree(nodes: FileTreeNode[], indent = '') {
	for (const node of nodes) {
		console.log(`${indent}${node.name} (${node.path}) [${node.type}]`)
		if (node.children) {
			printTree(node.children, `${indent}  `)
		}
	}
}

printTree(tree)
