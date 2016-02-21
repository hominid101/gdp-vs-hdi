format = d3.time.format("%d-%m-%Y (%H:%M h)");
// Draw a slope plot from the gdp_data. The left half of the
// plot displays the GDP of the countries and the right half of
// the plot displays the HDI of the countries. Color the
// connecting lines between GDP and HDI of the same same country
// according to the discrepancy beween GDP and HDI - color them one
// way when GDP is higher and the other way when the HDI is higher.
function draw(gdp_data) {
    "use strict";
    // D3.js setup code 
    var rank_diff_threshold = 30;
    var chart_margin = {top: 40, bottom: 30, left: 100, right: 100},
        chart_width = 600 - chart_margin.left - chart_margin.right,
        chart_height = 700 - chart_margin.top - chart_margin.bottom;
    var chart_svg = d3.select("body #wrap #main")
        .append("svg")
        .attr("width", chart_width + chart_margin.left + chart_margin.right)
        .attr("height", chart_height + chart_margin.top + chart_margin.bottom)
        .append('g')
        .attr('class', 'chart');
    var map_margin = {top: 10, bottom: 45, left: 10, right: 130},
        map_width = 300 - map_margin.left - map_margin.right,
        map_height = 200 - map_margin.top - map_margin.bottom;
    var map_svg = d3.select("body #wrap #sidebar .region_map")
        .append("svg")
        .attr("width", map_width + map_margin.left + map_margin.right)
        .attr("height", map_height + map_margin.top + map_margin.bottom)
        .append('g')
        .attr('class', 'map');
    var hi_gdp_svg = d3.select("body #wrap #sidebar .country_legend #hi_gdp")
    var lo_gdp_svg = d3.select("body #wrap #sidebar .country_legend #lo_gdp")
    var eq_gdp_svg = d3.select("body #wrap #sidebar .country_legend #eq_gdp")
    var left_indicator = 'GDP';
    var right_indicator = 'HDI';
    var hdi_color = '#aa015c';
    var gdp_color = '#5539f7';
    var neutral_color = '#a4a7ab';
    var left_extent = d3.extent(gdp_data, function(d) {
        return d[left_indicator];
    });
    var left_scale = d3.scale.linear()
        .domain(left_extent)
        .range([chart_height-chart_margin.top, chart_margin.bottom]);

    var right_extent = d3.extent(gdp_data, function(d) {
        return d[right_indicator];
    });
    var right_scale = d3.scale.linear()
        .domain(right_extent)
        .range([chart_height-chart_margin.top, chart_margin.bottom]);
    var years_set = d3.set();
    var regions_set = d3.set();
    var ccode_to_region = new Map();
    gdp_data.forEach(function(d) {
        years_set.add(d['Year']);
        if(!is_missing(d['Region'])) {
            if(!ccode_to_region.has(d['Country_Code'])) {
                ccode_to_region.set(d['Country_Code'], d['Region']);
            }
            regions_set.add(d['Region']);
        }
    });
    var years = [];
    years_set.forEach(function(d) {
        years.push(+d);
    });
    var regions = [];
    regions_set.forEach(function(d) {
        regions.push(d);
    });
    // State variables shared across functions
    var current_year = NaN;
    var current_region = '';
    var yearly_data;    

    var region_color_scale = d3.scale.category10().domain(regions);
    var time_extent = d3.extent(gdp_data, function(d) {
        return d['Year'];
    });
    var time_scale = d3.time.scale()
        .range([chart_margin.left, chart_width])
        .domain(time_extent);

    // Simple utility functions refactored from larger functions that follow.
    function key_country_year(d) {
        return d['Country_Name']+d['Year'];
    }
    function key_all(d) {
        return d;
    }
    function is_missing(d) {
        return !d;
    }
    var left_x = chart_margin.left;
    function left_y(d) {
        return left_scale(d[left_indicator])
    }
    var right_x = chart_margin.left+chart_width;
    function right_y(d) {
        return right_scale(d[right_indicator])
    }
    function different_rank(d, diff_threshold) {
        var rank_diff = d['HDI']-d['GDP'];
        var is_similar = (rank_diff < -1 * diff_threshold) ||
            (rank_diff > diff_threshold);
        return is_similar;
    }
    function circle_color(d) {
        var color = neutral_color;
        if(different_rank(d, rank_diff_threshold)) {
            if (d['GDP'] > d['HDI']) {
                color = gdp_color;
            } else if (d['GDP'] < d['HDI']) {
                color = hdi_color;
            }
        } 
        return color;              
    }
    function slope_width(d) {
        var width = 1;
        if(different_rank(d, rank_diff_threshold)) {
            width = 2;
        } 
        return width;              
    }
    function slope_color(d) {
        //var color = neutral_color;
        var color = region_color_scale(d['Region']);
        if(different_rank(d, rank_diff_threshold)) {
            color = region_color_scale(d['Region']);
        }
        return color;
    }
    function slope_opacity(d) {
        var opacity = 0.2;
        if(different_rank(d, rank_diff_threshold)) {
            opacity = 1;
        }
        return opacity;
    }
    function circle_radius(d) {
        var radius = '3px';
        if(different_rank(d, rank_diff_threshold)) {
            radius = '6px';
        }
        return radius;
    }
    function display_style(d) {
        var ds = is_missing(d[left_indicator])||is_missing(d[right_indicator]) ?
            "none" : null;
        return ds;
    }
    function region_color(d) {
        var color = "lightBlue";
        if(ccode_to_region.has(d.id)) {
            color = region_color_scale(ccode_to_region.get(d.id));
        }
        return color;
    }

    // Function Draw a world map with country boundaries
    function draw_country_map(geo_data) {
        var projection = d3.geo.mercator()
            .scale(45)
            .translate([map_width, map_height]);
        var path = d3.geo.path().projection(projection);
        var map = map_svg.selectAll('path')
            .data(geo_data.features)
            .enter()
            .append('path')
            .attr('id', function(d) {return d.id;})
            .attr('d', path)
            .style('fill', region_color)
            .style('stroke', 'black')
            .style('opacity', 0.2)
            .style('stroke-width', 0.5);
        debugger;
    }

    // Function to highlight the countries in gdp_data on the map
    function highlight_country_map(map_svg, gdp_data) {
        var ccodes = [];
        gdp_data.forEach(function(d) {
            if(different_rank(d, rank_diff_threshold)) {
                ccodes.push(d['Country_Code']);
            } 
        }); 
        map_svg.selectAll('path')
            .style('opacity', function(d) {
                return (ccodes.indexOf(d.id) !== -1) ? 1 : 0.2;
            })
    }

    
    // Function to blink the slopes and maps for a country. 
    function blink_country(country_data) {
        var cline = chart_svg.selectAll("line")
            .data([country_data], key_country_year);
        var lcir = chart_svg.selectAll("circle.left_circle")
            .data([country_data], key_country_year);
        var rcir = chart_svg.selectAll("circle.right_circle")
            .data([country_data], key_country_year);
        var cpath = map_svg.select('path#'+country_data["Country_Code"]);
        var blink_duration = 500;
        debugger;
        var blink_loop = function() {
            var fade = 0.2;
            cline.style('opacity', fade)
                .transition()
                .duration(blink_duration)
                .style('opacity', 1)
                .each('end',blink_loop);
            lcir.style('opacity', fade)
                .transition()
                .duration(blink_duration)
                .style('opacity', 1)
                .each('end',blink_loop);
            rcir.style('opacity', fade)
                .transition()
                .duration(blink_duration)
                .style('opacity', 1)
                .each('end',blink_loop);
            cpath.style('opacity', fade)
                .transition()
                .duration(blink_duration)
                .style('opacity', 1)
                .each('end',blink_loop);
        };
        blink_loop();
    }

    // Function to stop blinking
    function unblink_country(country_data) {
        chart_svg.selectAll("line")
            .data([country_data], key_country_year)
            .transition().duration(100)
            .style('opacity', 1);
        chart_svg.selectAll("circle.left_circle")
            .data([country_data], key_country_year)
            .transition().duration(100)
            .style('opacity', 1);
        chart_svg.selectAll("circle.right_circle")
            .data([country_data], key_country_year)
            .transition().duration(100)
            .style('opacity', 1);
        map_svg.select('path#'+country_data["Country_Code"])
            .transition().duration(100)
            .style('opacity', 1);
    }
    
    // Create a DOM element for displaying tool tips for a country on hover, and
    // and functions for showing, tracking, and hiding the tips
    var country_tip = d3.select("body #wrap #main")
        .append("div").attr("class", "tooltip");
    country_tip.append('div').attr('class', 'region');
    country_tip.append('p').style('clear', 'both');
    country_tip.append('div').attr('class', 'country');
    country_tip.append('p').style('clear', 'both');
    country_tip.append('div').attr('class', 'gdp_indicator');
    country_tip.append('p').style('clear', 'both');
    country_tip.append('div').attr('class', 'hdi_indicator');


    // Functions to display, track, and hide country tip on hover
    function show_tip(country_data) {
        if(different_rank(country_data, rank_diff_threshold)) {
            country_tip.select('.region')
                .style('color', circle_color(country_data))
                .html("<p class=\"alignleft\"><strong>Region:</strong><\p> <p class=\"alignright\">"+country_data.Region+"</p>");
            country_tip.select('.country')
                .style('color', slope_color(country_data))
                .html("<p class=\"alignleft\"><strong>Country:</strong><\p> <p class=\"alignright\">"+country_data.Country_Name+"</p>");
            country_tip.select('.gdp_indicator').html(
                "<p class=\"alignleft\"><strong>GDP Rank:</strong><\p> <p class=\"alignright\">"+country_data.GDP+"</p>");
            country_tip.select('.hdi_indicator').html(
                "<p class=\"alignleft\"><strong>HDI Rank:</strong><\p> <p class=\"alignright\">"+country_data.HDI+"</p>");
            country_tip.style('display', 'block');
            blink_country(country_data);
        }
    }
    function track_tip(country_data) {
        if(different_rank(country_data, rank_diff_threshold)) {
            var py = d3.event.pageY;
            var px = d3.event.pageX;
            country_tip.style('top', (py+1) + 'px');
            country_tip.style('left', (px+7) + 'px');
        }
    }
    function hide_tip(country_data) {
        if(different_rank(country_data, rank_diff_threshold)) {
            country_tip.style('display', 'none');
            unblink_country(country_data);
        }
    }

    // Function to hightlight a portion of a slope plot (an svg object)
    // Function to draw a slope plot of all countries in a year
    function draw_slopes(chart_svg, yearly_data) {
        // Remove circles and lines of previous year's slope plot 
        chart_svg.selectAll("line").remove();
        chart_svg.selectAll("circle.left_circle").remove();
        chart_svg.selectAll("circle.right_circle").remove();
        
        // Draw the lines
        var lines = chart_svg.selectAll("line")
            .data(yearly_data, key_country_year);
        lines.enter()
            .append("line")
            .attr("x1", left_x)
            .attr("y1", left_y)
            .attr("x2", right_x)
            .attr("y2", right_y) 
            .attr("stroke", slope_color)
            .attr("opacity", slope_opacity)
            .attr("stroke-width", slope_width)
            .on('mouseover', show_tip)
            .on('mouseout', hide_tip)
            .on('mousemove', track_tip);
        
        // Draw circles on the left; the represent GDP rankings
        var left_circles = chart_svg.selectAll("circle.left_circle")
            .data(yearly_data, key_country_year);
        left_circles.enter()
            .append("circle")
            .attr('class', 'left_circle')
            .attr("cx", left_x)
            .attr("cy", left_y)
            .attr("fill", circle_color)
            .attr("r", circle_radius)
            .on('mouseover', show_tip)
            .on('mouseout', hide_tip)
            .on('mousemove', track_tip);
        
        // Draw circles on the right; they representing HDI rankings
        var right_circles = chart_svg.selectAll("circle.right_circle")
            .data(yearly_data, key_country_year);
        right_circles.enter()
            .append("circle")
            .attr('class', 'right_circle')
            .attr("cx", right_x)
            .attr("cy", right_y)
            .attr("fill", circle_color)
            .attr("r", circle_radius)
            .on('mouseover', show_tip)
            .on('mouseout', hide_tip)
            .on('mousemove', track_tip);
    }

    function highlight_slopes(chart_svg, sdata) {
        // Show lines and circles for the selected countries and make them
        // react to mouse events. Fade others make make them non-reactive
        var lines = chart_svg.selectAll("line")
            .data(sdata, key_country_year)
            .style("opacity", slope_opacity)
            .attr('pointer-events', "all");
        lines.exit()
            .style("opacity", 0)          // faded and non-reactive
            .attr('pointer-events', "none");

        var left_circles = chart_svg.selectAll("circle.left_circle")
            .data(sdata, key_country_year)
            .style("opacity", 1)            // shown and reactive
            .attr('pointer-events', "all");
        left_circles.exit()
            .style("opacity", 0)          // faded and non-reactive
            .attr('pointer-events', "none"); 

        var right_circles = chart_svg.selectAll("circle.right_circle")
            .data(sdata, key_country_year)
            .style("opacity", 1)            // shown and reactive
            .attr('pointer-events', "all");
        right_circles.exit()
            .style("opacity", 0)          // faded and non-reactive
            .attr('pointer-events', "none"); 
    }


    // Function to highlight slope lines of all countries in a region
    function highlight_year_region(year, region, unfiltered_data) {
        var filtered_data = unfiltered_data.filter(function(d) {
            return (is_missing(year) || (d['Year']=='All') ||
                    (d['Year']===year)) &&
                (is_missing(region) || (d['All'] === region) ||
                 (d['Region'] === region));
        });
        debugger;
        highlight_slopes(chart_svg, filtered_data);
        highlight_country_map(map_svg, filtered_data);
    }

    // Function to display select options to pick a region to highlight
    function display_region_options(regions) {
        var select_elem = d3.select("#sidebar .region_select");
        select_elem.selectAll("option").remove();
        
        var option_values = [''].concat(regions);
        var region_options = select_elem.selectAll("option")
            .data(option_values, key_all);
        region_options.enter().append("option")
            .attr("value", function(d) {return d;})
            .text(function(d) {return (d=='') ? "All" : d;})
            .attr("style", function(d) {
                return "color:"+region_color_scale(d);
            })
            .each(function (d) {
                if(d=='') {
                    d3.select(this).attr("selected", "selected");
                }
            });
        select_elem.style('display', 'block');
        // handle on click event
        select_elem.on('change', function() {
            current_region = d3.select(this).property('value');
            highlight_year_region(current_year, current_region, yearly_data);
        });
    }

    // Function to filter and sort gdp data based on year and rank
    function sort_yearly_data(year, gdp_data) {
        // Select data corresponding to a year, and sort into two groups - one
        // group with uneven GDP/HDI rankings, and one with similar rankings
        var processed_data = gdp_data.filter(function(d) {
            return is_missing(year) || (d['Year']=='All') || (d['Year']===year);
        });
        processed_data.sort(function(a, b) {
            if(different_rank(a, rank_diff_threshold)) {
                return 1;
            } else {
                return 0;
            } 
        });
        return processed_data;
    }

    // Function to visualize yearly data on a slope plot and a world map
    function draw_yearly_data(year, yearly_data) {
        // List all regions in order of how ranks differ
        var gdp_regions = [], hdi_regions = [], other_regions = [];
        yearly_data.forEach(function(d) {
            var region = d['Region'];
            var rank_diff = d['GDP']-d['HDI'];
            if(different_rank(d, rank_diff_threshold)) {
                if (d['GDP'] > d['HDI']) {
                    if(!is_missing(region) && gdp_regions.indexOf(region)<0) {
                        gdp_regions.push(region);
                    }
                } else {
                    if(!is_missing(region) && hdi_regions.indexOf(region)<0) {
                        hdi_regions.push(region);
                    }
                }
            } else if(!is_missing(region) && other_regions.indexOf(region)<0) {
                other_regions.push(region);
            }
        }); 
        gdp_regions.sort(); hdi_regions.sort(); other_regions.sort();
        var diff_region_count = gdp_regions.length + hdi_regions.length;
        // Display titile and caption
        var title_elem = d3.select("#chart_title")
        if(is_missing(year)) {
            title_elem.html("Overall, only <em>"+diff_region_count+ "</em> regions show uneven economic and human developemnt.");
        } else if (diff_region_count==1) {
            title_elem.html("In <em>"+year+"</em>, only <em>"+diff_region_count+"</em> region shows uneven economic progress and human development.");
        } else {
            title_elem.html("In <em>"+year+"</em>, only <em>"+diff_region_count+"</em> regions show uneven economic and human development.");
        }
        var caption_elem = d3.select("#chart_caption")
        if(is_missing(year)) {
            caption_elem.html("Comparison of GDP and HDI rankings from <em>"+years[0]+"</em> to <em>"+years[years.length-1]+"</em>");
        } else {
            caption_elem.html("Comparison of GDP and HDI rankings in <em>"+year+"</em>");
        }

        // Draw slope plot for the current year
        draw_slopes(chart_svg, yearly_data);

        // Highlight the countries on the map
        highlight_country_map(map_svg, yearly_data);
    }

    // Function to display a drop down list to select a year
    function display_year_options(years) {
        var select_elem = d3.select("#sidebar .year_select")
        select_elem.selectAll("option").remove();
        
        var option_values = [NaN].concat(years);
        var year_options = select_elem.selectAll("option")
            .data(option_values, key_all);
        year_options.enter().append("option")
            .attr("value", function(d) {return d;})
            .text(function(d) {return isNaN(d) ? "All" : d;});

        select_elem.style('display', 'block');
        // handle on click event
        select_elem.on('change', function() {
            current_year = +d3.select(this).property('value');
            highlight_year_region(current_year, current_region, yearly_data);
        });
    }

    function select_year_option(year) {
        var select_elem = d3.select("#sidebar .year_select")
        select_elem.selectAll("option").each(function (d) {
            if((isNaN(d)&&isNaN(year)) || (d == year)) {
                current_year = year;
                d3.select(this).attr("selected", "selected");
            }
        });
    }

    // Take care of the right side bar
    d3.json("world_countries.json", draw_country_map); // World map
    display_year_options(years);                       // Year options
    display_region_options(regions);                   // Region options

    // Animate slope plots over the years, ending with all years
    var year_idx = 0;
    var year_interval = setInterval(function() {
        var year = years[year_idx];
        select_year_option(year);
        yearly_data = sort_yearly_data(year, gdp_data);
        draw_yearly_data(year, yearly_data);
        year_idx++;
        if(year_idx >= years.length) {
            // At the end of animation, plot all years at once, and
            // provide options to highligt any year and drill down
            clearInterval(year_interval);
            year = NaN;
            yearly_data = sort_yearly_data(year, gdp_data);
            select_year_option(year);
            draw_yearly_data(year, yearly_data);            
        }
    }, 1000);
};
