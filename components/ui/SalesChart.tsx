import React, { useEffect, useRef } from 'react';

// FIX: Removed the module import for Chart.js and declared it as a global
// constant to align with how external libraries are loaded in this project.
declare const Chart: any;

interface SalesChartProps {
    salesData: { month: string; count: number }[];
    onMonthClick: (monthIndex: number | null) => void;
    selectedMonthIndex: number | null;
}

const SalesChart: React.FC<SalesChartProps> = ({ salesData, onMonthClick, selectedMonthIndex }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    // FIX: Changed the type of the ref to `any` to match the global Chart object.
    const chartInstanceRef = useRef<any | null>(null);

    useEffect(() => {
        if (chartRef.current) {
            const ctx = chartRef.current.getContext('2d');
            if (!ctx) return;

            // Destroy previous chart instance if it exists
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }

            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(13, 71, 161, 0.7)'); // accent-primary
            gradient.addColorStop(1, 'rgba(66, 165, 245, 0.5)'); // accent-secondary

            const hoverGradient = ctx.createLinearGradient(0, 0, 0, 400);
            hoverGradient.addColorStop(0, 'rgba(13, 71, 161, 0.9)');
            hoverGradient.addColorStop(1, 'rgba(66, 165, 245, 0.8)');

            const labels = salesData.map(d => d.month);
            const data = salesData.map(d => d.count);

            const backgroundColors = data.map((_, index) => 
                selectedMonthIndex === null || selectedMonthIndex === index 
                ? gradient 
                : 'rgba(203, 213, 225, 0.5)' // border-secondary
            );
            const hoverBackgroundColors = data.map((_, index) => 
                selectedMonthIndex === null || selectedMonthIndex === index
                ? hoverGradient
                : 'rgba(203, 213, 225, 0.7)'
            );


            chartInstanceRef.current = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Số xe bán',
                        data: data,
                        backgroundColor: backgroundColors,
                        borderColor: 'rgba(13, 71, 161, 0)',
                        borderWidth: 1,
                        borderRadius: 6,
                        hoverBackgroundColor: hoverBackgroundColors,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#FFFFFF',
                            titleColor: '#0F172A',
                            bodyColor: '#64748B',
                            borderColor: '#E2E8F0',
                            borderWidth: 1,
                            padding: 10,
                            displayColors: false,
                            callbacks: {
                                label: function(context: any) {
                                    return `Số xe: ${context.parsed.y}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: '#F1F5F9', // surface-input
                            },
                            ticks: {
                                color: '#64748B' // text-secondary
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#64748B' // text-secondary
                            }
                        }
                    },
                    onClick: (_: any, elements: any[]) => {
                        if (elements.length > 0) {
                            const clickedIndex = elements[0].index;
                             // If the clicked month is already selected, deselect it. Otherwise, select it.
                            if (selectedMonthIndex === clickedIndex) {
                                onMonthClick(null);
                            } else {
                                onMonthClick(clickedIndex);
                            }
                        }
                    },
                    onHover: (event: any, chartElement: any[]) => {
                        const target = (event.native?.target as HTMLElement);
                        if (target) {
                           target.style.cursor = chartElement[0] ? 'pointer' : 'default';
                        }
                    },
                }
            });
        }

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [salesData, onMonthClick, selectedMonthIndex]);

    return <div className="h-64"><canvas ref={chartRef}></canvas></div>;
};

export default SalesChart;