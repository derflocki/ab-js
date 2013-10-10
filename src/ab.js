"use strict";
/**
 * load content in an iframe
 * @param params
 * @returns
 */
function iFrameLoadeder (params) {
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
		requestEndTime : null,
		requestDuration : null
	}, deferred = $.Deferred(), iframe = $('<img style="display:none"></img>');
	iframe.load(function () {
		iframe.remove();
		data.requestEndTime = new Date().getTime();
		deferred.resolve(null, null, data);
	}).error(function() {
		iframe.remove();
		data.requestEndTime = new Date().getTime();
		deferred.resolve(null, null, data);
	}) .attr({
		"src" : params.url
	});
	//document.body.appendChild(iframe[0]);
	$('body').append(iframe);
	return deferred.promise();
}
/**
 * load with ajax
 * @param params
 * @returns
 */
function ajaxLoader(params) {
	return $.ajax({
		method : params.get || 'get',
		url : params.url,
		cache : params.cache
	});
}

var ab = function (url, requests, concurrency) {
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
				page = iFrameLoadeder({
					url : chunk[i],
					cache: false
				});
				page.then(singleRequestComplete);
				deferreds.push(page);
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