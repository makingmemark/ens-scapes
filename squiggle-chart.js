const circleRadius = 10;
const circleStrokeWidth = 3;
const animDuration = 50000;  // Animation duration in milliseconds
const tooltip = document.getElementById('tooltip');

// Ensure the window is scrolled to the start initially
window.scrollTo(0, 0);

function mapValue(value, in_min, in_max, out_min, out_max) {
    return (value - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

// Fetch the mintData.json file asynchronously
fetch('mintData.json')
    .then(response => response.json())  // Parse the JSON data
    .then(mintData => {
        // Map the mintData to match the structure you need for D3.js
        const data = mintData.map(item => ({
            date: new Date(item.date),  // Convert the date string to Date object
            token_id: parseInt(item.tokenId, 10),  // Use tokenId as token_id
            to: item.to,
            ens: item.ens,
            hue_relic: item.attributes['Hue Relic'],
            hue_farewell: item.attributes['Hue Farewell'],
            order_relic: item.attributes['Order Relic'],
            order_farewell: item.attributes['Order Farewell'],
            matched_order: item.attributes['Matched Order']
        }));

        // Proceed with D3 chart creation
        createChart(data);
    })
    .catch(error => console.error('Error loading mintData.json:', error));

// Function to create the chart
function createChart(data) {
    function getRandomHSLColor() {
        const h = Math.floor(Math.random() * 360);  // Random hue between 0 and 360
        const s = 100;  // Saturation is 100%
        const l = 50;   // Lightness is 50%
        return `hsl(${h}, ${s}%, ${l}%)`;  // Returns the HSL color string
    }

    const svg = d3.select('svg'),
          margin = { top: 20, right: 30, bottom: 150, left: 50 },
          width = +svg.attr('width') - margin.left - margin.right,
          height = +svg.attr('height') - margin.top - margin.bottom,
          g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.date))
        .range([0, width]);

    // const y = d3.scaleLinear()
    //     .domain([0, d3.max(data, d => d.token_id)])
    //     .range([height, 0]);

    // Adjust y-scale to apply an exponential transformation
    const y = d3.scaleLinear()
    .domain([0, Math.pow(d3.max(data, d => d.token_id), 1.1)])  // Apply exponential scaling by using square root
    .range([height, 0]);

    // Define the line generator
    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.token_id))
        
        // .curve(d3.curveCardinal);
        // .curve(d3.curveCardinal.tension(0));  // More curvy with tension set to 0
        
        // .curve(d3.curveNatural)  // Very smooth, natural curves
        .curve(d3.curveCatmullRom.alpha(1))  // Adjust alpha for more or less curvature
        // .curve(d3.curveBasis); // very curvy but misses data points


    // Define a custom date formatter
    const formatDate = d3.timeFormat("%d %B");

    // Function to add the appropriate suffix to the day
    function formatDayWithSuffix(date) {
        const day = date.getDate();
        let suffix = 'th';
        if (day === 1 || day === 21 || day === 31) suffix = 'st';
        else if (day === 2 || day === 22) suffix = 'nd';
        else if (day === 3 || day === 23) suffix = 'rd';
        
        return `${day}${suffix} ${d3.timeFormat("%b")(date)}`;  // Format as 29th Aug
    }

    // Get the first date in your dataset
    const firstDate = d3.min(data, d => d.date);

    // Generate tick values with the first date and 20 ticks in total
    const tickValues = x.ticks(20);  // Generate the default ticks
    if (tickValues[0] !== firstDate) {
        tickValues.unshift(firstDate);  // Add the first date to the tick values if it's not already included
    }

    g.append('g')
    // .attr('transform', `translate(0,${height})`)
    .attr('stroke', 'white')
    .call(d3.axisBottom(x)
        .tickFormat(formatDayWithSuffix)  // Apply the custom formatting to the ticks
        .tickValues(tickValues)  // Use the modified tick values that include the first date
    );


    // left axis
    // g.append('g')
    // .attr('stroke', 'white')
    // .call(d3.axisLeft(y)
    //     .ticks(4)  // Increase this number to show more labels
    // );

    // Draw the full spline path with animation
    const path = g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', 'white')
        .attr('opacity', 1)
        .attr('stroke-width', 2)
        .attr('d', line);

    // Get the total length of the path
    const totalLength = path.node().getTotalLength();

   
    // Set up the path with stroke-dasharray and stroke-dashoffset for animation
    path
        // .attr('stroke-dasharray', totalLength + ' ' + totalLength)
        // .attr('stroke-dashoffset', totalLength)
        // .transition()
        // .duration(animDuration)  // Animation duration
        // .ease(d3.easeLinear)  // Linear easing for smooth drawing
        // .attr('stroke-dashoffset', 0);

    // Threshold for random horizontal offset
    const offsetThreshold = 20;  // You can adjust this value

   
    // Draw two randomly colored circles at each data point with random offsets, after the stroke reaches them
    g.selectAll('circle')
        .data(data)
        .enter()
        .each(function(d, i) {
            const pointLength = path.node().getPointAtLength(i * totalLength / (data.length - 1)).x;
            const point = path.node().getPointAtLength(pointLength);
    
            // Create a group (g element) to contain both circles
            let group = g.append('g')
                .attr('class', 'data-group')
                .attr('transform', `translate(${x(d.date)},${y(d.token_id)})`)
                .on('click', function() {
                    console.log(`You clicked on the data point with mint number: ${d.token_id}`);
                    window.open(`https://opensea.io/assets/ethereum/0xf7ed7bd9824ada3a2c6e753ce10ca61aedd63fad/${d.token_id}`, '_blank');
                })
                .on('mouseover', function(event) {
                    // Change the fill color of both circles in the group
                    d3.select(this).selectAll('circle')
                        .attr('fill', function() { return d3.select(this).attr('stroke'); });

                    let addy = d.ens ? d.ens : d.to.substring(0, 6) + '...' + d.to.substring(d.to.length - 4);
                    tooltip.innerHTML = `Squiggle Farewell #${d.token_id}<br> ${d.order_relic} | ${d.order_farewell} | ${addy}`;
                    

                    //  tooltip.style.opacity = 0;
                    // Position the tooltip above the mouse and make it visible
                    tooltip.style.left = (event.pageX - 110) + 'px';  // Offset to the right of the mouse
                    tooltip.style.top = (event.pageY - 80) + 'px';   // Offset above the mouse
                    tooltip.style.opacity = 1;  // Show the tooltip
                    
                })
                .on('mouseout', function() {
                    // Reset the fill color of both circles in the group to transparent
                    d3.select(this).selectAll('circle')
                        .attr('fill', 'transparent');
                    
                    tooltip.style.opacity = 0;
                       
                });
    

            // First circle in the group
            // let firstCircleColour = getRandomHSLColor();
            const offset = 50;
            let firstCirclePos = 0 - mapValue(d.order_relic, 0, 3148, 0, offset);
            let secondCirclePos = 0 + mapValue(d.order_farewell, 0, 3148, 0, offset);
            group.append('circle')
                .attr('data-cicle-label', 'first' )
                // .attr('cx', 0)
                // .attr('cx', getRandomOffset(offsetThreshold))  // Random offset to the left
                .attr('cx', firstCirclePos)  // Random offset to the left
                
                .attr('cy', 0)
                .attr('r', circleRadius)
                .attr('stroke-width', circleStrokeWidth)
                // .attr('stroke', firstCircleColour)
                .attr('stroke', d.hue_relic == 9998 ? `white` : `hsl(${d.hue_relic}, 100%, 50%)` )
                .attr('fill', 'transparent');  // Default fill is transparent

                 // Second circle in the group
            let secondCircleColour = getRandomHSLColor();
            group.append('circle')
            .attr('data-cicle-label', 'second' )
                // .attr('cx', getRandomOffset(offsetThreshold))  // Random offset to the right
                .attr('cx', secondCirclePos)
                .attr('cy', 0)
                .attr('r', circleRadius)
                .attr('stroke-width', circleStrokeWidth)
                
                // .attr('stroke', secondCircleColour)
                .attr('stroke', d.hue_farewell == 9998 ? `white` : `hsl(${d.hue_farewell}, 100%, 50%)` )
                .attr('fill', 'transparent');  // Default fill is transparent

    
           


            
        });

         // Add evenly spaced white circles along the path
        // const numWhiteCircles = 2000;  // Number of white circles you want to add
        // for (let i = 0; i <= numWhiteCircles; i++) {
        //     const pointLengthCircles = (i / numWhiteCircles) * totalLength;  // Calculate the length for each white circle
        //     const pointCircles = path.node().getPointAtLength(pointLengthCircles);  // Get the x and y coordinates along the path

        //     // Place the white circle at the calculated position
        //     g.append('circle')
        //         .attr('cx', pointCircles.x)
        //         .attr('cy', pointCircles.y)
        //         .attr('r', 5)  // Radius of the white circles
        //         .attr('stroke', 'white')
        //         .style('opacity', 0.8);  // Slight transparency for the white circles
        // }


}

// Function to generate random horizontal offset within a threshold
function getRandomOffset(threshold) {
    return (Math.random() * threshold * 2) - threshold;  // Random number between -threshold and +threshold
}


function smoothScrollLeftToRight(duration) {
    console.log('smoothScrollLeftToRight')
    window.scrollTo(0, 0);
    const startX = window.scrollX;  // Get the current horizontal scroll position
    const endX = document.body.scrollWidth - window.innerWidth;  // The maximum scrollable width
    const distance = endX - startX;  // Calculate how much we need to scroll
    const startTime = performance.now();  // Get the start time

    function scrollStep(timestamp) {
        const elapsedTime = timestamp - startTime;
        const progress = Math.min(elapsedTime / duration, 1);  // Progress as a percentage (max 1)
        
        // Calculate the new scroll position using an easing function (optional for smoothness)
        const newX = startX + distance * easeInOutQuad(progress);  // Smooth scrolling formula
        // const newX = startX + distance * progress;
        
        window.scrollTo(newX, 0);  // Scroll horizontally to the new position

        if (progress < 1) {
            requestAnimationFrame(scrollStep);  // Continue scrolling until complete
        }
    }

    requestAnimationFrame(scrollStep);  // Start the animation
}

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}




// // // Wait for 3 seconds before starting the smooth scroll
setTimeout(() => {
    console.log('timeout')
    smoothScrollLeftToRight(animDuration);  // Scroll smoothly over X seconds
}, 3000);  // Wait for 3 seconds


