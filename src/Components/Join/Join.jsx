import React from "react";
import { navigate } from "@reach/router";
import firebase from "../../config";
import "firebase/firestore";
const db = firebase.firestore();

class Join extends React.Component {
    state = {
        code: '',
        errormsg: '',
    }

submitCode = (event) => {
   event.preventDefault()

   let regex = /[A-Z]{4}/g
   if (!regex.test(this.state.code)) {
      this.setState({
          errormsg: 'Code should be 4 letters long & not contain special characters!'
      })
   } else {
    db.collection('rooms').doc(this.state.code).get()
    .then((doc)=> {
        if(doc.exists) {
            db.collection('rooms').doc(this.state.code).collection('users').doc(this.props.user).set({
          username: this.props.user,
          score: 0,
          answers: [],
          incorrect_answers: 0,
          avatar: this.props.avatar
            })
            navigate(`/quiz/${this.state.code}`)
        } else {
            this.setState({
                errormsg: 'Sorry, that room does not exist!'
            })
        }
    })
   }
 }
    
handleChange = (event) => {
   let value = event.target.value.toUpperCase()
   this.setState( {
       code: value,
       errormsg: ''
   })
}


render() {
    return(
     <div className='join-wrapper'>
     <h1 className='enter-code'>Enter your code</h1>
     <form className='code-form' onSubmit={this.submitCode}>
     <input value={this.state.code} onChange={this.handleChange} type='text'></input>
     <button className='code-btn' type='submit'>SUBMIT CODE</button>
     </form>
     <div className='error'>
         <h3>{this.state.errormsg}</h3>
         </div>
     </div>
    )
}

}


export default Join;