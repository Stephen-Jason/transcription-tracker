import { Bar } from 'react-chartjs-2';
import Chart from 'chart.js/auto';
import { useSelector } from 'react-redux';
import { dateObjectFromString } from '../../generalDateFunctions';
import classes from "./BarChart.module.css"
import { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, child, get } from "firebase/database";
import TabsContainer from './TabsContainer';

const firebaseConfig = {
    apiKey: "AIzaSyDZtwc1-uknDuGCvIenRXPOOdNyGCeoN_M",
    authDomain: "transcriptiontracker.firebaseapp.com",
    databaseURL: "https://transcriptiontracker-default-rtdb.firebaseio.com",
    projectId: "transcriptiontracker",
    storageBucket: "transcriptiontracker.appspot.com",
    messagingSenderId: "87847571379",
    appId: "1:87847571379:web:72e88ea08c14db0f0945c6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const hourLabels = ["00:00-01:00", "01:00-02:00", "02:00-03:00", "03:00-04:00", "04:00-05:00", "05:00-06:00", "06:00-07:00", "07:00-08:00", "08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00", "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00", "16:00-17:00", "17:00-18:00", "18:00-19:00", "19:00-20:00", "20:00-21:00", "21:00-22:00", "22:00-23:00", "23:00-00:00"];

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];


const BarChart = (props) => {
    const currentDateAsObject = dateObjectFromString(useSelector(state => state.selectedDate));
    const selectedYear = useSelector(state => state.selectedYear);
    const selectedDay = useSelector(state => state.selectedDay);

    const [selectByCategoryTab, setSelectByCategoryTab] = useState({
        "Jobs Received": true,
        "Time Spent": false,
        "Avg Accuracy": false,
        "Money Earned": false
    });

    const [selectByDateTab, setSelectByDateTab] = useState({
        day: true,
        month: false,
        year: false
    });

    const [jobData, setJobData] = useState({});

    const readTest = (year) => {
        let dbRef = ref(db);
        get(child(dbRef, `${year}/`)).then(snapshot => {
            if (snapshot.exists()) {
                setJobData(snapshot.val());
            }
            else {
                console.log("no data");
                setJobData({})
            }
        })
    }

    useEffect(() => {
        readTest(currentDateAsObject.getFullYear())
    }, [currentDateAsObject.getFullYear()])


    const dateTabHandler = (e) => {
        const { id } = e.target;
        let currentTabsSelected = { ...selectByDateTab };
        for (let key in currentTabsSelected) {
            currentTabsSelected[key] = false;
        }
        currentTabsSelected[id] = true;
        setSelectByDateTab(currentTabsSelected);
    }


    const categoryTabHandler = (e) => {
        const { id } = e.target;
        let currentTabsSelected = { ...selectByCategoryTab };
        for (let key in currentTabsSelected) {
            currentTabsSelected[key] = false;
        }
        currentTabsSelected[id] = true;
        setSelectByCategoryTab(currentTabsSelected);
    }

    const getAllJobsFromSelectedDay = () => {
        if (jobData != null) {
            let jobs = [];

            let jobsInMonth = jobData[months[currentDateAsObject.getMonth()]];
            for (let job in jobsInMonth) {
                if (parseInt(jobsInMonth[job]["day"]) === parseInt(selectedDay)) {
                    jobs.push(jobsInMonth[job]);
                }
            }
            return jobs;
        }
        return {};
    }

    const getAllJobsFromSelectedMonth = () => {
        if (jobData != null) {
            return jobData[months[currentDateAsObject.getMonth()]]
        }
        return {};
    }

    const filteredJobsByDate = () => {
        if (selectByDateTab["day"]) {
            return getAllJobsFromSelectedDay();
        }
        if (selectByDateTab["month"]) {
            return getAllJobsFromSelectedMonth();
        }
        if (selectByDateTab["year"]) {
            return jobData;
        }
    }

    const fillArrayForDaysRange = (array) => {
        // fill array with 24 zeroes
        for (let i = 0; i < 24; i++) {
            array.push(0);
        }
    }

    const fillArrayForMonthRange = (array) => {
        let newDateObject = new Date(currentDateAsObject.getFullYear(), currentDateAsObject.getMonth() + 1, 0);
        let daysInThisMonth = newDateObject.getDate();
        for (let i = 0; i < daysInThisMonth; i++) {
            array.push(0);
        }
    }

    const dayJobsReceived = (jobsArray, jobs) => {
        for (let job in jobs) {
            let [jobHour, jobMinute] = jobs[job]["time received"].split(":");
            jobsArray[jobHour]++;
        }
    }

    const dayTimeSpent = (jobsArray, jobs) => {
        for (let job in jobs) {
            let [jobHour, jobMinute] = jobs[job]["time received"].split(":");
            let [durationHour, durationMinute, durationSecond] = jobs[job]["time spent"].split(":");
            jobsArray[jobHour] += parseInt(durationMinute);
        }
    }

    const dayAvgAccuracy = (jobsArray, jobs) => {
        let countOfJobsInEachHour = [...jobsArray];
        for (let job in jobs) {
            let [jobHour, jobMinute] = jobs[job]["time received"].split(":");
            let jobAccuracy = jobs[job]["accuracy"];
            jobsArray[jobHour] += jobAccuracy;
            countOfJobsInEachHour[jobHour]++;
        }
        // average all the jobs' accuracies that have more than one job in an hour
        for (let i = 0; i < 24; i++) {
            if (countOfJobsInEachHour[i] > 1) {
                jobsArray[i] /= countOfJobsInEachHour[i];
            }
        }
    }

    const dayMoneyEarned = (jobsArray, jobs) => {
        for (let job in jobs) {
            let [jobHour, jobMinute] = jobs[job]["time received"].split(":");
            let jobPay = jobs[job]["pay"]
            jobsArray[jobHour] += parseFloat(jobPay);

        }
    }

    const monthJobsReceived = (jobsArray, jobs) => {
        for (let job in jobs) {
            let dayIndex = (jobs[job]["day"]) - 1;
            jobsArray[dayIndex]++;
        }
    }
    const monthTimeSpent = (jobsArray, jobs) => {
        for (let job in jobs) {
            let dayIndex = (jobs[job]["day"]) - 1;
            let [dayDurationHours, dayDurationMinutes, dayDurationSeconds] = jobs[job]["time spent"].split(":");
            jobsArray[dayIndex] += parseInt(dayDurationMinutes);
        }
    }
    const monthAvgAccuracy = (jobsArray, jobs) => {
        let countOfJobsPerDayArray = [...jobsArray];
        for (let job in jobs) {
            let dayIndex = (jobs[job]["day"]) - 1;
            let dayAccuracy = jobs[job]["accuracy"];
            jobsArray[dayIndex] += dayAccuracy;
            countOfJobsPerDayArray[dayIndex]++;
        }

        for (let i = 0; i < jobsArray.length; i++) {
            if (countOfJobsPerDayArray[i] > 1) {
                jobsArray[i] /= countOfJobsPerDayArray[i];
            }
        }
    }
    const monthMoneyEarned = (jobsArray, jobs) => {
        for (let job in jobs) {
            let dayIndex = (jobs[job]["day"]) - 1;
            let dayPay = parseFloat(jobs[job]["pay"])
            jobsArray[dayIndex] += dayPay;
        }
    }


    const filteredJobsByCategory = (jobs) => {
        let jobsArray = [];
        if (selectByDateTab["day"]) {
            fillArrayForDaysRange(jobsArray);
            if (selectByCategoryTab["Jobs Received"]) {
                dayJobsReceived(jobsArray, jobs)
            }
            if (selectByCategoryTab["Time Spent"]) {
                dayTimeSpent(jobsArray, jobs)
            }
            if (selectByCategoryTab["Avg Accuracy"]) {
                dayAvgAccuracy(jobsArray, jobs)
            }
            if (selectByCategoryTab["Money Earned"]) {
                dayMoneyEarned(jobsArray, jobs)
            }
        }

        if (selectByDateTab["month"]) {
            fillArrayForMonthRange(jobsArray);

            if (selectByCategoryTab["Jobs Received"]) {
                monthJobsReceived(jobsArray, jobs);
            }

            if (selectByCategoryTab["Time Spent"]) {
                monthTimeSpent(jobsArray, jobs);
            }

            if (selectByCategoryTab["Avg Accuracy"]) {
                monthAvgAccuracy(jobsArray, jobs);
            }

            if (selectByCategoryTab["Money Earned"]) {
                monthMoneyEarned(jobsArray, jobs);
            }
        }

        if(selectByDateTab["year"]){
            // fill the array with 12, for the months
            for(let i = 0; i < 12; i++){
                jobsArray.push(0);
            }

            if(selectByCategoryTab["Jobs Received"]){
                for(let month in jobs ){
                    let indexOfMonth = months.findIndex(index=>index === month);
                    for(let job in jobs[month]){
                        jobsArray[indexOfMonth] += 1;
                    }
                }
            }

            if(selectByCategoryTab["Time Spent"]){
                for(let month in jobs){
                    let indexOfMonth = months.findIndex(index=>index ===month);
                    let timeSpent = 0;
                    for(let job in jobs[month]){
                        let jobTimeSpent = jobs[month][job]["time spent"];
                        let minutes = (jobTimeSpent.split(":"))[1];
                        timeSpent += parseInt(minutes);
                    }
                    jobsArray[indexOfMonth] = timeSpent;
                }
            }

            if(selectByCategoryTab["Avg Accuracy"]){
                for(let month in jobs){
                    let indexOfMonth = months.findIndex(index=>index===month);
                    let accuracyCount = [];
                    // array to hold amount of accuracy values
                    for(let i = 0; i < 12; i++){
                        accuracyCount.push(0);
                    }

                    for(let job in jobs[month]){
                        let avgAccuracy = jobs[month][job]["accuracy"];
                        jobsArray[indexOfMonth] += parseFloat(avgAccuracy);
                        accuracyCount[indexOfMonth]++;
                    }
                    // average the accuracies
                    for(let i = 0; i < 12; i++){
                        if(accuracyCount[i] > 1){
                            jobsArray[i] /= accuracyCount[i];
                        }
                    }
                }
            }

            if(selectByCategoryTab["Money Earned"]){
                for(let month in jobs){
                    let indexOfMonth = months.findIndex(index=>index===month);
                    for(let job in jobs[month]){
                        let pay = jobs[month][job]["pay"];
                        jobsArray[indexOfMonth] += parseFloat(pay);
                    }
                }
            }


        }
        return jobsArray;
    }

    
    const generateChartInfo = (filteredData) => {
        // generate labels based on the days in selected month, just for month date range
        let daysInMonthLabel = [];
        for (let i = 0; i < filteredData.length; i++) {
            daysInMonthLabel.push(`${i + 1} ${months[currentDateAsObject.getMonth()].slice(0, 3)}`);
        }


        let labels = selectByDateTab["day"] ? hourLabels :
            selectByDateTab["month"] ? daysInMonthLabel : 
            selectByDateTab["year"] ? months : hourLabels;
        let key = selectByCategoryTab["Jobs Received"] ? "Jobs Received" :
            selectByCategoryTab["Time Spent"] ? "Time Spent" :
                selectByCategoryTab["Avg Accuracy"] ? "Avg Accuracy" :
                    selectByCategoryTab["Money Earned"] ? "Money Earned" : null;

        let color = selectByCategoryTab["Jobs Received"] ? "green" :
            selectByCategoryTab["Time Spent"] ? "yellow" :
                selectByCategoryTab["Avg Accuracy"] ? "red" :
                    selectByCategoryTab["Money Earned"] ? "blue" : null;
        return {
            labels: labels,
            datasets: [
                {
                    label: key,
                    backgroundColor: color,
                    borderWidth: 2,
                    data: filteredData
                }
            ]
        }
    }

    const getChartData = () => {
        let filteredByDate = filteredJobsByDate();
        let filteredByCategory = filteredJobsByCategory(filteredByDate);
        return generateChartInfo(filteredByCategory);
    }



    return (
        <>
            <div className={classes.mainContainer}>
                <div className={classes.dateTabsContainer}>
                    <div></div>
                    <TabsContainer
                        tabIds={["day", "month", "year"]}
                        clickHandler={dateTabHandler}
                        isActive={selectByDateTab}
                    />
                </div>
                <div className={classes.categoriesAndChartContainers}>
                    <div className={classes.categoryTabsContainer}>
                        <TabsContainer
                            tabIds={["Jobs Received", "Time Spent", "Avg Accuracy", "Money Earned"]}
                            clickHandler={categoryTabHandler}
                            isActive={selectByCategoryTab}
                        />
                    </div>
                    <div className={classes.chartContainer}>
                        <Bar
                            data={getChartData()}
                            options={{
                                title: {
                                    display: true,
                                    text: 'Test',
                                    fontSize: 20
                                },
                                legend: {
                                    display: true,
                                    position: "right"
                                }
                            }}
                        />
                    </div>
                </div>


            </div>

        </>
    )
}

export default BarChart;