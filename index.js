const fs = require('fs')
const path = require('path')
const core = require('@actions/core')
const github = require('@actions/github')
const semver = require('semver')

function getBooleanInput(input) {
	return !['', 'undefined', 'null', 'false', '0', 'no', 'off'].includes(String(input).toLowerCase().trim())
}

async function run() {
	try {
		const mainFile = process.env.MAIN_FILE || 'index.php'
		const mainFileExt = path.extname(mainFile)
		const composerPath = path.join(process.cwd(), 'composer.json')
		const composer = JSON.parse(fs.readFileSync(composerPath, 'utf8'))
		const wordpress = composer?.extra?.wordpress || {}
		const { owner, repo } = github.context.repo

		const type = mainFileExt.endsWith('css') ? 'Theme' : 'Plugin'

		const headers = {
			[`${type} Name`]: wordpress[`${type} Name`] || composer?.name || '',
			[`${type} URI`]: wordpress[`${type} URI`] || composer?.homepage || '',
			'Version': wordpress['Version'] || composer?.version || '',
			'Description': wordpress['Description'] || composer?.description || '',
			'Author': wordpress['Author'] || (composer?.authors?.[0]?.name || ''),
			'Author URI': wordpress['Author URI'] || (composer?.authors?.[0]?.homepage || ''),
			'GitHub URI': `${owner}/${repo}` || '',
			'Remote File': wordpress['Remote File'] || '',
			'Release Asset': wordpress['Release Asset'] || '',
			'Remote Visibility': wordpress['Remote Visibility'] || '',
			'Requires PHP': wordpress['Requires PHP'] || (semver.coerce(composer?.require?.php) || '').toString().replace(/\.0+$/, '') || '',
			'Requires at least': wordpress['Requires at least'] || '',
			'Compatible up to': wordpress['Compatible up to'] || wordpress['Tested up to'] || wordpress['Tested'] || '',
			'License': wordpress['License'] || composer?.license || '',
			'License URI': wordpress['License URI'] || '',
		}

		// Remove the alternate keys, so they are not added back in the for loop
		delete wordpress['Tested up to']
		delete wordpress['Tested']

		for (const [key, value] of Object.entries(wordpress)) {
			headers[key] = value
		}

		let content = ''

		if (type === 'Plugin') {
			content += `<?php\n\n`
		}

		content += `/**\n`
		for (const [key, value] of Object.entries(headers)) {
			if (value) {
				content += ` * ${key}: ${value}\n`
			}
		}
		content += ' */\n\n'

		if (type === 'Plugin') {
			if (composer?.extra?.['main-file-prepend']) {
				if (Array.isArray(composer.extra['main-file-prepend'])) {
					composer.extra['main-file-prepend'] = composer.extra['main-file-prepend'].join('\n')
				}
				content += composer.extra['main-file-prepend'] + `\n\n`
			}
			if (process.env.MAIN_FILE_PREPEND) {
				content += process.env.MAIN_FILE_PREPEND + `\n\n`
			}
			content += `defined( 'ABSPATH' ) || exit;\n\nrequire __DIR__ . '/vendor/autoload.php';\n\n`
			if (process.env.MAIN_FILE_APPEND) {
				content += process.env.MAIN_FILE_APPEND + `\n\n`
			}
			if (composer?.extra?.['main-file-append']) {
				if (Array.isArray(composer.extra['main-file-append'])) {
					composer.extra['main-file-append'] = composer.extra['main-file-append'].join('\n')
				}
				content += composer.extra['main-file-append'] + `\n\n`
			}
		}

		fs.writeFileSync(mainFile, content)
		console.log(`${mainFile} created successfully`)
		core.setOutput('project-name', (composer?.name || '').split('/').pop())

		if (getBooleanInput(process.env.FALLBACK_SCREENSHOT || null)) {
			const allowedExtensions = ['png', 'gif', 'jpg', 'jpeg', 'webp', 'avif']
			const screenshotExists = allowedExtensions.some(ext => fs.existsSync(`screenshot.${ext}`))
			if (!screenshotExists) {
				fs.writeFileSync(`screenshot.png`, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=', 'base64'))
				console.log(`Created screenshot.png`)
			}
		}
	} catch (error) {
		core.setFailed(error.message)
	}
}

run()
