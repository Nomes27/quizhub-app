import React from "react";
import "firebase/firestore";
import firebase from "../../config.js";
import "firebase/functions";
import { navigate } from "@reach/router";
import * as _ from "underscore";
import trophy from "../../img/trophy.png";
const db = firebase.firestore();
//const room = db.collection("Rooms").doc("XYZA");
const rooms = db.collection("rooms");
class Room extends React.Component {
  state = {
    users: [],
    host: "",
    questions: [],
    time_up: false,
    current_question: 0,
    isLoading: true,
    selected: false,
  };

  returnToDashboard = () => {
    navigate("/dashboard");
    if (this.props.user === this.state.host) {
      this.updateLeaderBoard();

      db.collection("rooms").doc(this.props.room_id).delete();
      //delete the doc
    }
  };

  getUserInfo = () => {
    return rooms.doc(this.props.room_id).collection("users").get();
  };

  getRoomInfo = (roomData) => {
    const userData = [];
    this.getUserInfo().then((docs) => {
      docs.forEach((doc) => {
        userData.push(doc.data());
        //NOW HAVE ACCESS TO USER DATA FOR ROOM - NEED TO SET TO STATE
      });
      this.setState({
        users: [...userData],
        host: roomData.host,
        questions: [...roomData.questions],
        time_up: roomData.time_up,
        current_question: roomData.current_question,
        isLoading: false,
      });
    });
  };

  processNextQuestion = () => {
    db.collection("rooms")
      .doc(this.props.room_id)
      .update({
        current_question: firebase.firestore.FieldValue.increment(1),
        time_up: false,
      });
  };

  selectAnswer = (event) => {
    const answer = event.target.innerText;

    rooms
      .doc(this.props.room_id)
      .collection("users")
      .doc(this.props.user)
      .update({ answers: firebase.firestore.FieldValue.arrayUnion(answer) });
    this.setState({ selected: true });
  };

  updateUserScore = () => {
    ///compare each users answers against the correct answer, update score on db
    db.collection("rooms")
      .doc(this.props.room_id)
      .collection("users")
      .doc(this.props.user)
      .get()
      .then((doc) => {
        let answer = doc.data().answers[this.state.current_question];

        if (
          answer ===
          this.state.questions[this.state.current_question].correct_answer
          // this.state.questions[this.state.current_question].correct_answer
        ) {
          db.collection("rooms")
            .doc(this.props.room_id)
            .collection("users")
            .doc(this.props.user)
            .update({ score: firebase.firestore.FieldValue.increment(1) });
          //updated score is not being shown on the page, need to set the state of users, so updated score shows on page
        } else {
          console.log("incorrect answer");
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  roomListener = db
    .collection("rooms")
    .doc(this.props.room_id)
    .onSnapshot((roomSnapshot) => {
      if (
        roomSnapshot.data() !== undefined &&
        roomSnapshot.data().current_question !== this.state.current_question
      ) {
        this.setState({
          current_question: roomSnapshot.data().current_question,
          selected: false,
        });
      }
      if (
        roomSnapshot.data() !== undefined &&
        roomSnapshot.data().time_up !== this.state.time_up
      ) {
        this.setState({
          time_up: roomSnapshot.data().time_up,
        });
      }
    });

  allAnsweredListener = db
    .collection("rooms")
    .doc(this.props.room_id)
    .collection("users")
    .onSnapshot((usersSnapshot) => {
      let allAnswered = true;
      //checking to see if time_up is true, so we know to display the results and the next question button
      if (this.state.time_up === false) {
        usersSnapshot.forEach((user) => {
          if (user.data().answers.length <= this.state.current_question) {
            allAnswered = false;
          }
        });

        if (allAnswered === true) {
          //

          db.collection("rooms")
            .doc(this.props.room_id)
            .update({ time_up: true });
          this.updateUserScore();
        }
      } else {
        // if time up is true, get users by scores and put in state so they can be displayed display
        const newUsers = [];
        usersSnapshot.forEach((user) => {
          newUsers.push(user.data());
        });

        newUsers.sort(function compare(a, b) {
          //sort the user scores
          if (a.score > b.score) {
            return -1;
          }
          if (a.score < b.score) {
            return 1;
          }
          // a must be equal to b
          return 0;
        });

        this.setState({
          users: [...newUsers],
        });
      }
    });
  //if user doesnt exist as doc, use set, else update
  updateLeaderBoard = () => {
    let winner = this.state.users[0].username;

    db.collection("Leaderboard")
      .doc(winner)
      .get()
      .then((user) => {
        if (user.exists) {
          db.collection("Leaderboard")
            .doc(winner)
            .update({
              score: firebase.firestore.FieldValue.increment(10),
              name: winner,
            });
        } else {
          db.collection("Leaderboard").doc(winner).set({
            score: 10,
            name: winner,
          });
        }
      });
  };

  playAgain = () => {
    this.updateLeaderBoard();
    console.log(this.state.users);
    this.props.resetQuiz();
    this.state.users.forEach((user) => {
      const newUser = {
        username: user.username,
        score: 0,
        answers: [],
      };
      db.collection("rooms")
        .doc(this.props.room_id)
        .collection("users")
        .doc(user.username)
        .set(newUser);
    });

    db.collection("rooms")
      .doc(this.props.room_id)
      .update({ current_question: 0 });
  };

  componentDidMount() {
    rooms
      .doc(this.props.room_id)
      .get()
      .then((doc) => {
        if (doc.exists) {
          const roomData = doc.data();
          this.getRoomInfo(roomData);
        } else {
          console.log("No such document!");
        }
      })
      .catch(function (error) {
        console.log("Error getting document:", error);
      });
  }

  decode = (sentence) => {
    let newSentence = _.unescape(sentence.replace(/&#039;/g, "'"));
    newSentence.replace(/&eacute;/g, "é");
    newSentence.replace(/&rsquo;/g, "'");
    return newSentence;
  };

  render() {
    if (this.state.isLoading === true) {
      return <h1>LOADING.....</h1>;
    } else {
      return (
        <div className="questions-wrapper">
          {this.state.current_question !== 10 ? (
            <div className="current-question">
              <h2 className="question-num">
                Question {this.state.current_question + 1}
              </h2>
              <div className="box sb1">
                <h3>
                {this.decode(
                  this.state.questions[this.state.current_question].question
                )}
                </h3>        
              </div>
              <div className="answerbuttons--container">
                {this.state.questions[
                  this.state.current_question
                ].all_answers.map((answer) => {
                  return (
                    <button
                      disabled={this.state.selected}
                      onClick={this.selectAnswer}
                      className="answerbutton"
                      key={answer}
                    >
                      {this.decode(answer)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            // announce winner
            <div className="winner-banner">
              <h1 className="winner">
                {this.state.users[0].username} is the winner!
              </h1>
              <img className="trophy" src={trophy}></img>
            </div>
          )}
          <div className="user-scores-container">
            <h4 className="user-scores">Scores:</h4>
            {this.state.users.map((user, i) => {
              return (
                <p
                  className="user-score"
                  key={user + i}
                >{`${user.username}: ${user.score}`}</p>
              );
            })}
          </div>
          {this.state.time_up &&
          this.props.user === this.state.host &&
          this.state.current_question !== 10 ? (
            <button
              className="next-question-btn"
              onClick={this.processNextQuestion}
            >
              NEXT QUESTION
            </button>
          ) : null}
          {this.state.current_question === 10 && (
            <div className="endgame-buttons-container">
              {this.props.user === this.state.host && (
                <button className="endgame-buttons" onClick={this.playAgain}>
                  PLAY AGAIN
                </button>
              )}

              <button
                className="endgame-buttons"
                onClick={this.returnToDashboard}
              >
                RETURN TO DASHBOARD
              </button>
            </div>
          )}
        </div>
      );
    }
  }
}

export default Room;
