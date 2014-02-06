"use strict";

/**
 * 
 */
var ab = function (url, requests, concurrency, post_data, loader_in) {
		var loader = undefined;
		if(!loader_in) {
			loader = ab.loader["ajaxLoader"];
		} else {
			if(typeof loader_in !== 'function') {
				loader = ab.loader[loader_in];
				if(typeof loader !== 'function') {
					throw new Error("Cannot use undeclared loader '" + loader_in + '". ');
				}
			} else {
				loader = loader_in;
			}
		}
		var method = "GET";
		if(!post_data || post_data === "") {
			post_data = undefined;
		} else {
			method = "POST";
		}
		try {
			post_data = jQuery.parseJSON(post_data);
		} catch (e) {
			
		}
			
		if(post_data)
		//TODO: try the ajaxloader, then use the ImgLoader as a fallback
		var rc = 0;
		var singleRequestComplete = function (data, textStatus, jqXHRIn) {
			rc++;
			var jqXHR = {};
			jqXHR.requestStartTime = jqXHRIn.requestStartTime;
			if(!jqXHR.requestEndTime) {
				jqXHR.requestEndTime = new Date().getTime();
			}
			jqXHR.requestDuration = jqXHR.requestEndTime - jqXHR.requestStartTime;
			
			dfd.xhrs.push(jqXHR);
			dfd.notify({
				count : rc,
				results : dfd.xhrs
			});
		};
		var chunkComplete = function (data, textStatus, jqXHRIn) {
			url_chunks.shift();
			fetch_chunks(url_chunks);
		};
		var chunk = function (array, chunkSize) {
			return [].concat.apply([], array.map(function (elem, i) {
				return i % chunkSize ? [] : [ array.slice(i, i + chunkSize) ];
			}));
		};
		var fetch_chunks = function (url_chunks) {
			var i = 0, page, chunk = url_chunks[0], data = {}, deferreds = [];
			if (chunk) {
				// process this chunk
				// after the chunk is processed remove the item from the
				// array and call fetch_chunks again
				for (i = 0; i < chunk.length; i++) {
					/*page = ImgLoadeder({
						url : chunk[i],
						cache: false
					});
					*/
					page = loader({
						url : chunk[i],
						cache: false,
						method: method,
						data: post_data
					});
					if(page && page.then) {
						page.then(singleRequestComplete);
						deferreds.push(page);
					} else {
						dfd.reject(null);
						throw new Error("'" + loader_in + '"does not return a jQuery Deferred.');
					}
					
				}
				$.when.apply($, deferreds).then(chunkComplete);
			} else {
				data['url'] = dfd.url;
				data['requests'] = dfd.requests;
				data['concurrency'] = dfd.concurrency;
				data['results'] = dfd.xhrs;
				dfd.resolve(data);
			}
		};
		requests = parseInt(requests, 10);
		concurrency = parseInt(concurrency, 10);
		var dfd = new $.Deferred();
		dfd.xhrs = [];
		dfd.url = url;
		dfd.requests = requests;
		dfd.concurrency = concurrency;
		
		// make chunks of urls according to # of requests and concurrency
		var urls = Array.apply(null, new Array(requests)).map(String.prototype.valueOf, url);
		
		var url_chunks = chunk(urls, concurrency);
		fetch_chunks(url_chunks);
		
		var promise = dfd.promise();
		promise.cancleNow = function () {
			//just remove all remaining chunks
			url_chunks = [];
			var data = {};
			data['url'] = dfd.url;
			data['requests'] = dfd.requests;
			data['concurrency'] = dfd.concurrency;
			data['results'] = dfd.xhrs;
			dfd.reject(data);
		};
		return promise;
};

function parseAbResults (results) {
	var min = Number.MAX_VALUE, max = Number.MIN_VALUE, mean = 0, sigma = 0, dur = 0, median = -1, i = 0, total = {};
	results.sort(function (a, b) {
		return a.requestDuration - b.requestDuration;
	});
	var n = results.length, sum = 0, sum_sig = 0;
	median = results[Math.floor(n / 2)].requestDuration;
	
	for (i = 0; i < n; i++) {
		dur = results[i].requestDuration;
		sum += dur;
		min = Math.min(dur, min);
		max = Math.max(dur, max);
	}
	mean = sum/n;
	for (i = 0; i < n; i++) {
		sum_sig += Math.pow((results[i].requestDuration - mean),2);
	}
	sigma = Math.sqrt(sum_sig/n);
	
	total = {
		min : min.toFixed(1),
		max : max.toFixed(1),
		median : median,
		mean : mean.toFixed(1),
		sigma : sigma.toFixed(1)
	};
	
	return total;
};

ab.loader = {
	/**
	 * <img> loader
	 * 
	 * same-origin policy does not apply
	 * @param params
	 * @returns
	 */
	 ImgLoader: function (params) {
		var now = new Date().getTime(), parser = document.createElement('a');
		parser.href = params.url;
		if((params.cache | false) == false) {
			if(parser.search) {
				params.url += "&_=" + now;
			} else {
				params.url += "?_=" + now;
			}
		}
		
		var data = {
			requestStartTime : now,
			requestEndTime : null
		}, deferred = $.Deferred(), callback = function() {
			img.remove();
			data.requestEndTime = new Date().getTime();
			deferred.resolve(null, null, data);
		}, img = $('<img style="display:none"></img>');
		
		img.load(callback).error(callback).attr({
			"src" : params.url
		});

		$('body').append(img);
		return deferred.promise();
	},
	
	/**
	 * <iframe> loader, does not support POST, but measures performance of the onload of the url
	 * 
	 * same-origin policy does not apply
	 * @param params
	 * @returns
	 */
	 IframeLoader: function (params) {
		var now = new Date().getTime(), parser = document.createElement('a');
		parser.href = params.url;
		if((params.cache | false) == false) {
			if(parser.search) {
				params.url += "&_=" + now;
			} else {
				params.url += "?_=" + now;
			}
		}
		
		var data = {
			requestStartTime : now,
			requestEndTime : null
		}, deferred = $.Deferred(), callback = function() {
			img.remove();
			data.requestEndTime = new Date().getTime();
			deferred.resolve(null, null, data);
		}, img = $('<iframe style="display:none"></iframe>');
		
		img.load(callback).error(callback).attr({
			"src" : params.url
		});

		$('body').append(img);
		return deferred.promise();
	},
	/**
	 * XMLHttpRequest loader
	 * 
	 * same-origin policy applies
	 * @param params
	 * @returns
	 */
	AjaxLoader: function(params) {
		params.method = params.method || 'get';
		var deferred = $.Deferred(), data = {
			requestStartTime : new Date().getTime(),
			requestEndTime : null,
			status: null,
			statusText: null
		};
		$.ajax(params).done(function(dataIn, textStatus, jqXHR) {
			data.requestEndTime = new Date().getTime();
			data.status = jqXHR.status;
			data.statusText = jqXHR.statusText;
			deferred.resolve(null, null, data);
		}).fail(function(jqXHR, textStatus, dataIn) {
			data.requestEndTime = new Date().getTime();
			data.status = jqXHR.status;
			data.statusText = jqXHR.statusText;
			deferred.resolve(null, null, data);
		});
		return deferred.promise();
	}
};
