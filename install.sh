#!/bin/bash

echo "installing obsidian zenmode"

if [ -z "$OBSIDIAN_DIR" ]; then
	if ! [ -e .env ]; then
		echo "please set OBSIDIAN_DIR"
		exit 1
	else
		source .env
		if [ -z "$OBSIDIAN_DIR" ]; then
			echo "please set OBSIDIAN_DIR in .env"
			exit 1
		fi
	fi
fi

if ! [ -e node_modules ]
then
	bun install
fi

bun run build

installfile() {
	cp "$1" "$OBSIDIAN_DIR/.obsidian/plugins/zenmode/$1"
}

installfile data.json
installfile main.js
installfile manifest.json
installfile styles.css
