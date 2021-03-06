const fs = require('fs')
const path = require('path')
const chokidar = require('chokidar')
const short = require('short-uuid')
const { performance } = require('perf_hooks')

const ox = {
	_manifest(key) {
		const base = path.resolve(process.cwd())
		const filePath = `${base}/manifest.json`
		const absolute = `/${key}`
		let record = {}

		if(fs.existsSync(filePath)){
			const file = fs.readFileSync(filePath)
			record = JSON.parse(file)
			record[absolute] = `${absolute}?id=${short.generate()}`
		}
		record[absolute] = `${absolute}?id=${short.generate()}`

		fs.writeFileSync(filePath, JSON.stringify(record, null, 4))
	},
    _add(fn) {
        const blueprint = (options = {}) => {

            // Defaults for every task
            const defaults = {
                watch: false,
                log: true,
                perf: true
            }

            // Assign defaults if they don't exist
            for(const [key, value] of Object.entries(defaults)) {
                if(options[key] === undefined) {
                    options[key] = value
                }
            }

            // Destructor for convenience
            const { name, perf, log, watch } = options

            // Start performance
            const t0 = performance.now()

            // Set title based on function name or name passed
            const title = !(name || fn.name) ? 'automatic' : `${ name || fn.name}`

            // Let user know we're getting things started
            log ? this._log(`Starting ${ title } task`) : null

            // Give tasks access to underscore functions
            Object.getOwnPropertyNames(this).forEach(prop => {
                if(typeof this[prop] === 'function' && prop[0] === '_') {
                    options[prop] = this[prop]
                }
            })

            // Call the task and pass the decorated options
            fn(options)

            // Calculate time taken to complete task
            const t1 = performance.now()
            perf ? this._log(`Task took: ${Math.round(t1 - t0)}ms`) : null

            // Watch the task if the option was set
            watch ? this._watch(watch, fn, options) : null

            return this
        }

        // If the function name exists we assign it to the ox object so it can be called
        if(fn.name) {
            this[fn.name] = blueprint
        } else {
            // If not we just run it.
            this._log(`Function name doesn't exist, running it immediately.`)
            blueprint({ log: true, perf: true })
        }

        return this
    },
    _log(value) {
        console.log(value)
        return this
    },
    _watch(watched, fn, options) {

        let events = ['change']

        if(watched.events) {
            events = watched.events
        }

        const delimiter = (process.platform === "win32") ? "\\" : "/"
        let p = path.join(process.cwd(), options.watch)
        p = p.split(delimiter)
        p.pop()
        p = p.join(delimiter)

        if(p) {
            const watcher = chokidar.watch(p)

            events.forEach(event => {
                watcher.on(event, end => {
                    this._log(`${end} was ${event}d.`)
                    fn(options)
                })
            })
        }


        return this
    }
}

module.exports = ox
