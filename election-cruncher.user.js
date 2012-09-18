// ==UserScript==
// @name          PKU Election Cruncher
// @version       0.2
// @namespace     http://www.ryanli.org/scripts/election-cruncher
// @description   Elect courses in Peking University automatically
// @include       http://elective.pku.edu.cn/elective2008/edu/pku/stu/elective/controller/supplement/SupplyAndCancel.do
// @include       http://elective.pku.edu.cn/elective2008/edu/pku/stu/elective/controller/supplement/supplement.jsp*
// @copyright     2011 - 2012, Ryan Li <ryanli@ryanli.org>
// @licence       GPL version 3; http://www.gnu.org/copyleft/gpl.html
// ==/UserScript==

// intended for Array but also usable for HTML node list, same goes for map
var filter = function(func, array) {
	var ret = [];
	for (var i = 0; i < array.length; ++i)
		if (func(array[i]))
			ret.push(array[i]);
	return ret;
};

var map = function(func, array) {
	var ret = [];
	for (var i = 0; i < array.length; ++i)
		ret.push(func(array[i]));
	return ret;
};

// table containing pending courses
var table = document.getElementsByClassName("datagrid")[0];
var tlen = table.getElementsByTagName("tr")[0].getElementsByTagName("th").length;
// first we get all course rows
var courseRows = filter(function(n) {
		return n.getElementsByTagName("td").length > 5;
	}, table.getElementsByTagName("tr"));
// and we filter out the electable courses
var courseRows = filter(function(n) {
		return n.getElementsByTagName("td")[tlen - 1].getElementsByTagName("a")[0].href.indexOf("javascript:") == 0;
	}, courseRows);
// so we get the courses that are full
var courseNames = map(function(n) {
		return n.getElementsByTagName("td")[0].textContent;
	}, courseRows);

var insertBefore = table.parentNode.parentNode.previousSibling;

var row = document.createElement("tr");
insertBefore.parentNode.insertBefore(row, insertBefore);

var cell = document.createElement("td");
cell.colSpan = 2;
row.appendChild(cell);

var container = document.createElement("div");
cell.appendChild(container);

var msg = document.createElement("div");
container.appendChild(msg);
msg.textContent = "Fill in the captcha on the right, select your course, and hit \"Go!\"";

var select = document.createElement("select");
container.appendChild(select);

for (var i = 0; i < courseNames.length; ++i) {
	var option = document.createElement("option");
	option.value = i;
	option.textContent = courseNames[i];
	select.appendChild(option);
}

var crunch = function() {
	var getCourseInfo = function(row) {
		var cell = row.getElementsByTagName("td")[tlen - 1];
		var link = cell.getElementsByTagName("a")[0].href;
		var regex = new RegExp("javascript:refresh\\('(.+)'\\);", "i");
		var args = link.match(regex)[1];
		var params = args.split(/','/);
		var index = Number(params[3]);
		var seq = params[4];
		var maximum = Number(params[5]);
		return {
			index : index,
			seq : seq,
			maximum : maximum
		};
	};
	var courseId = select.options[select.selectedIndex].value;
	var elect = function() {
		var captcha = document.getElementById("validCode").value;
		var url = "http://elective.pku.edu.cn"
			+ "/elective2008/edu/pku/stu/elective/controller/supplement/validate.do"
			+ "?validCode=" + captcha;
		var captchaXhr = new XMLHttpRequest();
		captchaXhr.open("GET", url, true);
		captchaXhr.onreadystatechange = function() {
			if (captchaXhr.readyState == 4 && captchaXhr.status == 200) {
				var node = captchaXhr.responseXML.getElementsByTagName("valid")[0];
				var valid = (node.textContent == 2);
				if (!valid) {
					msg.textContent = "Captcha invalid!";
					return;
				}
				var info = getCourseInfo(courseRows[courseId]);
				msg.textContent = "Trying: "
					+ "index=" + info.index + ", "
					+ "seq=" + info.seq + ", "
					+ "maximum=" + info.maximum + "…";
				var url = "http://elective.pku.edu.cn/"
					+ "elective2008/edu/pku/stu/elective/controller/supplement/refresh.do"
					+ "?index=" + info.index
					+ "&seq=" + info.seq;
				var electXhr = new XMLHttpRequest();
				electXhr.open("GET", url, true);
				electXhr.onreadystatechange = function() {
					if (electXhr.readyState == 4 && electXhr.status == 200) {
						var node = electXhr.responseXML.getElementsByTagName("electedNum")[0];
						var current = Number(node.textContent);
						msg.textContent += "current: " + current + ".";
						if (current < info.maximum) {
							// we could elect this course
							window.location = "http://elective.pku.edu.cn"
								+ "/elective2008/edu/pku/stu/elective/controller/supplement/electSupplement.do"
								+ "?index=" + info.index
								+ "&seq=" + info.seq;
						}
						else {
							setTimeout(elect, 5000);
						}
					}
				};
				electXhr.send();
			}
		};
		captchaXhr.send();
	};
	elect();
};

var commit = document.createElement("input");
commit.type = "button";
commit.value = "Go!";
commit.addEventListener("click", crunch, false);
container.appendChild(commit);
